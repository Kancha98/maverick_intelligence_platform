from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import psycopg2
import os
import urllib.parse as urlparse
from dotenv import load_dotenv
import json
import numpy as np
import math
from tvDatafeed import TvDatafeed, Interval
import traceback
import requests

# Load environment variables
load_dotenv()

# Create a custom JSON encoder to handle NaN, Infinity, and other special values
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
        if isinstance(obj, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32, np.int64, np.uint8, np.uint16, np.uint32, np.uint64)):
            return int(obj)
        if isinstance(obj, (np.float16, np.float32, np.float64)):
            if math.isnan(obj) or math.isinf(obj):
                return None
            return float(obj)
        if isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        return super(CustomJSONEncoder, self).default(obj)

app = Flask(__name__)
# Set the custom JSON encoder
app.json_encoder = CustomJSONEncoder
CORS(app)

#-----------------------------------
# Database Connection Functions (from init_db.py)
#-----------------------------------

def init_connection():
    db_url = os.environ.get("NEON_DB_URL")
    if not db_url:
        raise Exception("Database URL not found in environment variables!")
    url = urlparse.urlparse(db_url)
    return psycopg2.connect(
        database=url.path[1:],
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port or "5432"
    )

def init_database():
    try:
        conn = init_connection()
        print("Connected to database successfully.")
        
        # Create tables if they don't exist
        with conn.cursor() as cur:
            # Check if financial_metrics table exists
            cur.execute("""
                SELECT EXISTS (
                   SELECT FROM information_schema.tables 
                   WHERE table_name = 'financial_metrics'
                );
            """)
            table_exists = cur.fetchone()[0]
            
            if not table_exists:
                print("Creating financial_metrics table...")
                # Create financial_metrics table
                cur.execute("""
                    CREATE TABLE financial_metrics (
                        id SERIAL PRIMARY KEY,
                        code VARCHAR(20) NOT NULL,
                        eps_ttm NUMERIC,
                        bvps NUMERIC,
                        dps NUMERIC,
                        cum_np NUMERIC,
                        roe NUMERIC,
                        roa_ttm NUMERIC,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                
                # Insert some sample data for testing
                cur.execute("""
                    INSERT INTO financial_metrics (code, eps_ttm, bvps, dps, cum_np, roe, roa_ttm)
                    VALUES
                        ('AAF.N0000', 2.50, 15.75, 0.75, 1250000, 15.8, 8.2),
                        ('BALA.N0000', 1.85, 12.30, 0.50, 925000, 12.4, 6.5),
                        ('CIC.X0000', 3.20, 18.60, 1.00, 1580000, 17.2, 9.1),
                        ('ELPL.N0000', 1.65, 10.80, 0.40, 820000, 11.5, 5.8),
                        ('GRAN.N0000', 4.10, 22.50, 1.20, 2050000, 18.3, 9.8),
                        ('HBS.N0000', 2.30, 14.20, 0.65, 1150000, 14.2, 7.5),
                        ('LIOC.N0000', 5.40, 28.70, 1.50, 2700000, 19.5, 10.2),
                        ('LVEF.N0000', 1.95, 12.80, 0.55, 975000, 13.1, 6.9),
                        ('PARQ.N0000', 2.80, 16.40, 0.80, 1400000, 16.5, 8.8),
                        ('SDF.N0000', 2.15, 13.60, 0.60, 1075000, 13.8, 7.2),
                        ('SHOT.N0000', 3.50, 19.80, 1.10, 1750000, 17.8, 9.4),
                        ('UML.N0000', 2.05, 13.20, 0.58, 1025000, 13.5, 7.0),
                        ('AMF.N0000', 2.70, 16.10, 0.78, 1350000, 16.2, 8.6);
                """)
                
                conn.commit()
                print("Financial metrics table created and sample data inserted successfully.")
            else:
                print("Financial metrics table already exists.")
                
            # Check the existing columns
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'financial_metrics';
            """)
            columns = [row[0] for row in cur.fetchall()]
            print(f"Existing columns: {columns}")
            
        conn.close()
        print("Database initialization completed.")
        return True
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        traceback.print_exc()
        return False

def load_data():
    conn = init_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM stock_analysis_all_results;")
        colnames = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
    conn.close()
    df = pd.DataFrame(rows, columns=colnames)
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'])
    return df

#-----------------------------------
# TradingView Data Functions - Implemented directly here
#-----------------------------------

def get_tv_latest_price(symbol):
    try:
        tv = TvDatafeed()
        index_data = tv.get_hist(
            symbol=symbol,
            exchange='CSELK',
            interval=Interval.in_daily,
            n_bars=10
        )
        
        if index_data is not None and 'close' in index_data and len(index_data) > 0:
            return {"latestPrice": float(index_data['close'].iloc[-1])}
        
        # Fallback to database closing price if TradingView API fails
        try:
            # Get the latest price from the database
            conn = init_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT closing_price FROM stock_analysis_all_results WHERE symbol = %s ORDER BY date DESC LIMIT 1",
                (symbol,)
            )
            result = cursor.fetchone()
            if result and result[0]:
                return {"latestPrice": float(result[0]), "fallback": "database"}
            
            # If no database price is found, return a more informative fallback
            return {"latestPrice": None, "fallback": "no_data", "message": "No price data available"}
        except Exception as db_error:
            print(f"Database fallback error for {symbol}: {str(db_error)}")
            # Return a clear indication that this is not real data
            return {"latestPrice": None, "fallback": "error", "message": "Price data unavailable"}
    except Exception as e:
        print(f"Error fetching latest price: {str(e)}")
        # Try database fallback
        try:
            conn = init_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT closing_price FROM stock_analysis_all_results WHERE symbol = %s ORDER BY date DESC LIMIT 1",
                (symbol,)
            )
            result = cursor.fetchone()
            if result and result[0]:
                return {"latestPrice": float(result[0]), "fallback": "database"}
            
            # If no database price is found
            return {"latestPrice": None, "fallback": "no_data", "message": "No price data available", "error": str(e)}
        except Exception as db_error:
            print(f"Database fallback error for {symbol}: {str(db_error)}")
            return {"latestPrice": None, "fallback": "error", "message": "Price data unavailable", "error": str(e)}

def get_tv_ohlcv(symbol):
    try:
        tv = TvDatafeed()
        index_data = tv.get_hist(
            symbol=symbol,
            exchange='CSELK',
            interval=Interval.in_daily,
            n_bars=200
        )
        if index_data is not None and not index_data.empty:
            # Prepare OHLCV data for charting
            ohlcv = []
            for idx, row in index_data.iterrows():
                ohlcv.append({
                    'date': idx.strftime('%Y-%m-%d'),
                    'open': float(row['open']),
                    'high': float(row['high']),
                    'low': float(row['low']),
                    'close': float(row['close']),
                    'volume': float(row['volume'])
                })
            return {"ohlcv": ohlcv}
        
        # Fallback data generation
        print(f"Generating fallback data for {symbol}")
        # Generate some sample data
        from datetime import datetime, timedelta
        import random
        
        ohlcv = []
        base_price = 100.0
        end_date = datetime.now()
        
        for i in range(200):
            date = end_date - timedelta(days=i)
            daily_volatility = random.uniform(-2, 2)
            price = base_price + (base_price * daily_volatility / 100)
            
            ohlcv.append({
                'date': date.strftime('%Y-%m-%d'),
                'open': price - random.uniform(0, 1),
                'high': price + random.uniform(0, 2),
                'low': price - random.uniform(0, 2),
                'close': price,
                'volume': random.randint(10000, 1000000)
            })
            
            # Update base price for next day
            base_price = price
        
        # Return in reverse order (oldest to newest)
        ohlcv.reverse()
        return {"ohlcv": ohlcv, "fallback": True}
    except Exception as e:
        print(f"Error fetching OHLCV data: {str(e)}")
        traceback.print_exc()
        
        # Generate fallback data
        # Same fallback generation as above
        print(f"Generating fallback data for {symbol}")
        from datetime import datetime, timedelta
        import random
        
        ohlcv = []
        base_price = 100.0
        end_date = datetime.now()
        
        for i in range(200):
            date = end_date - timedelta(days=i)
            daily_volatility = random.uniform(-2, 2)
            price = base_price + (base_price * daily_volatility / 100)
            
            ohlcv.append({
                'date': date.strftime('%Y-%m-%d'),
                'open': price - random.uniform(0, 1),
                'high': price + random.uniform(0, 2),
                'low': price - random.uniform(0, 2),
                'close': price,
                'volume': random.randint(10000, 1000000)
            })
            
            # Update base price for next day
            base_price = price
        
        # Return in reverse order (oldest to newest)
        ohlcv.reverse()
        return {"ohlcv": ohlcv, "fallback": True, "error": str(e)}

@app.route('/api/ohlcv/<symbol>', methods=['GET'])
def ohlcv_route(symbol):
    result = get_tv_ohlcv(symbol)
    if isinstance(result, tuple) and len(result) > 1:
        return jsonify(result[0]), result[1]
    return jsonify(result)

@app.route('/api/latest-price/<symbol>', methods=['GET'])
def latest_price_route(symbol):
    result = get_tv_latest_price(symbol)
    if isinstance(result, tuple) and len(result) > 1:
        return jsonify(result[0]), result[1]
    return jsonify(result)

#-----------------------------------
# Flask Routes
#-----------------------------------

# Initialize database route
@app.route('/init-db', methods=['POST'])
def initialize_database():
    success = init_database()
    if success:
        return jsonify({'status': 'success', 'message': 'Database initialized successfully'})
    else:
        return jsonify({'status': 'error', 'message': 'Failed to initialize database'}), 500

# Original app.py routes
@app.route('/symbols')
def get_symbols():
    try:
        df = load_data()
        symbols = sorted(df['symbol'].unique().tolist())
        return jsonify({'symbols': symbols})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/cse-predictor')
def cse_predictor():
    try:
        date = request.args.get('date')
        symbol = request.args.get('symbol')
        df = load_data()
        if date:
            df = df[df['date'] >= pd.to_datetime(date)]

        # Ensure numeric types
        for col in ['turnover', 'volume', 'relative_strength']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # Filter for volume and turnover
        df = df[(df['turnover'] > 999999) & (df['volume'] > 9999)]

        # Get financial metrics
        conn = init_connection()
        with conn.cursor() as cur:
            # Get financial data
            cur.execute("SELECT code, eps_ttm, bvps, dps FROM financial_metrics;")
            fin_data = cur.fetchall()
        conn.close()
        
        # Create financial metrics dictionary
        fin_metrics = {}
        for row in fin_data:
            code, eps_ttm, bvps, dps = row
            fin_metrics[code] = {
                'eps_ttm': eps_ttm,
                'bvps': bvps,
                'dps': dps
            }
        
        # Group by date
        grouped = {}
        for d, group in df.groupby(df['date'].dt.strftime('%Y-%m-%d')):
            # Tier 1
            t1 = group[
                (group['rsi_divergence'] == "Bullish Divergence") &
                (group['volume_analysis'].isin(["Emerging Bullish Momentum", "Increase in weekly Volume Activity Detected"])) 

            ]
            # Tier 2
            t2 = group[
                (
                    (group['volume_analysis'].isin(["Emerging Bullish Momentum", "High Bullish Momentum"])) &
                    (group['relative_strength'] >= 1)
                ) |
                (group['rsi_divergence'] == "Bullish Divergence")
            ]
            
            # Add financial metrics to each stock
            t1_list = t1.to_dict(orient='records')
            t2_list = t2.to_dict(orient='records')
            
            # Add financial metrics to each stock in t1 and t2
            for stock_list in [t1_list, t2_list]:
                for stock in stock_list:
                    symbol_code = stock['symbol']
                    if symbol_code in fin_metrics:
                        stock.update(fin_metrics[symbol_code])
            
            grouped[d] = {
                'tier1Picks': t1_list,
                'tier2Picks': t2_list
            }

        # Chart data (for the selected symbol)
        chart_data = []
        if symbol:
            chart_df = df[df['symbol'] == symbol].sort_values('date')
            chart_data = chart_df[['date', 'closing_price']].to_dict(orient='records')

        return jsonify({
            'groupedPicks': grouped,
            'chartData': chart_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/fundamental-metrics')
def fundamental_metrics():
    try:
        conn = init_connection()
        # First, check if financial_metrics table exists
        with conn.cursor() as cur:
            cur.execute("""
                SELECT EXISTS (
                   SELECT FROM information_schema.tables 
                   WHERE table_name = 'financial_metrics'
                );
            """)
            table_exists = cur.fetchone()[0]
            
            if not table_exists:
                return jsonify({
                    'metrics': [], 
                    'error': 'Table financial_metrics does not exist in the database'
                }), 404
                
            # If table exists, fetch the metrics
            cur.execute("SELECT * FROM financial_metrics;")
            colnames = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
        
        metrics_df = pd.DataFrame(rows, columns=colnames)
        print(f"Loaded {len(metrics_df)} rows from financial_metrics table")
        print(f"Columns: {metrics_df.columns.tolist()}")
        
        # Now, get latest closing prices
        with conn.cursor() as cur:
            # Query to get the latest closing_price for each symbol
            query = """
                SELECT symbol, closing_price
                FROM stock_analysis_all_results
                WHERE (symbol, date) IN (
                    SELECT symbol, MAX(date)
                    FROM stock_analysis_all_results
                    GROUP BY symbol
                );
            """
            cur.execute(query)
            closing_price_data = cur.fetchall()
        
        conn.close()
        
        # Process closing price data
        closing_price_df = pd.DataFrame(closing_price_data, columns=["symbol", "closing_price"])
        closing_price_df["closing_price"] = pd.to_numeric(closing_price_df["closing_price"], errors='coerce')
        print(f"Loaded {len(closing_price_df)} closing prices")
        
        # Map the database column names to the names expected by the frontend
        # Based on the columns we found in the actual database
        db_to_frontend_mapping = {
            "code": "code",
            "eps_ttm": "EPS(TTM)",
            "bvps": "Book Value Per Share",
            "dps": "Dividend Per Share",
            "cum_np": "Cumulative Net Profit",
            "roe": "Return on Equity",
            "roa_ttm": "Return on Assets",
            "pe_ttm": "PER",  # Assuming this is the PER column in the database
            "pbv": "PBV",     # PBV column already exists
            "dy": "DY(%)"     # Dividend Yield column
        }
        
        # Rename columns based on which ones actually exist
        rename_cols = {k: v for k, v in db_to_frontend_mapping.items() if k in metrics_df.columns}
        metrics_df = metrics_df.rename(columns=rename_cols)
        
        # Check if code column exists under a different name
        if 'code' not in metrics_df.columns:
            if 'symbol' in metrics_df.columns:
                metrics_df = metrics_df.rename(columns={'symbol': 'code'})
        
        # Convert all numeric columns to float to handle NaN properly
        numeric_cols = metrics_df.select_dtypes(include=['number']).columns
        for col in numeric_cols:
            metrics_df[col] = pd.to_numeric(metrics_df[col], errors='coerce')
                
        # Merge financial metrics with closing prices
        if 'code' in metrics_df.columns:
            # Merge with closing prices
            metrics_df = pd.merge(
                metrics_df, closing_price_df,
                left_on="code", right_on="symbol", how="left"
            )
            print(f"After merge: {len(metrics_df)} rows")
            
            # Drop the redundant 'symbol' column after merging if it exists
            if 'symbol' in metrics_df.columns:
                metrics_df.drop(columns=["symbol"], inplace=True)
            
            # Add the latest close price column
            metrics_df['Latest Close Price'] = metrics_df['closing_price']
            
            # Calculate ratios if they don't already exist
            # Calculate PER if it doesn't exist
            if 'PER' not in metrics_df.columns and 'eps_ttm' in metrics_df.columns:
                metrics_df['PER'] = pd.to_numeric(metrics_df['closing_price'], errors='coerce') / pd.to_numeric(metrics_df['EPS(TTM)'], errors='coerce')
                metrics_df['PER'] = metrics_df['PER'].round(2)
            
            # Calculate PBV if it doesn't exist
            if 'PBV' not in metrics_df.columns and 'Book Value Per Share' in metrics_df.columns:
                metrics_df['PBV'] = pd.to_numeric(metrics_df['closing_price'], errors='coerce') / pd.to_numeric(metrics_df['Book Value Per Share'], errors='coerce')
                metrics_df['PBV'] = metrics_df['PBV'].round(2)
            
            # Calculate DY(%) if it doesn't exist
            if 'DY(%)' not in metrics_df.columns and 'Dividend Per Share' in metrics_df.columns:
                metrics_df['DY(%)'] = pd.to_numeric(metrics_df['Dividend Per Share'], errors='coerce') / pd.to_numeric(metrics_df['closing_price'], errors='coerce') * 100
                metrics_df['DY(%)'] = metrics_df['DY(%)'].round(2)
                
            # Drop the intermediary closing_price column if we now have Latest Close Price
            if 'closing_price' in metrics_df.columns and 'Latest Close Price' in metrics_df.columns:
                metrics_df.drop(columns=["closing_price"], inplace=True)
        
        # Replace NaN, infinity values with None for proper JSON serialization
        metrics_df.replace([float('inf'), float('-inf')], None, inplace=True)
        
        # Convert to records (list of dicts) for JSON serialization
        # Use pandas.DataFrame.where() to replace NaN with None
        metrics_df = metrics_df.apply(lambda col: col.map(lambda x: float(x) if isinstance(x, (np.floating, float)) else x))

        metrics_data = metrics_df.where(pd.notna(metrics_df), None).to_dict(orient='records')
        
        print(f"Returning {len(metrics_data)} formatted records")
        
        # Test JSON serialization to catch errors before returning
        try:
            json.dumps({'metrics': metrics_data}, cls=CustomJSONEncoder)
        except Exception as e:
            print(f"JSON serialization error: {e}")
            # If there's an error, manually clean the data
            clean_metrics = []
            for item in metrics_data:
                clean_item = {}
                for k, v in item.items():
                    if isinstance(v, float) and (np.isnan(v) or np.isinf(v) or math.isnan(v)):
                        clean_item[k] = None
                    else:
                        clean_item[k] = v
                clean_metrics.append(clean_item)
            metrics_data = clean_metrics
            
        return jsonify({'metrics': metrics_data})
    except Exception as e:
        print(f"Error in fundamental_metrics: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/debug-db')
def debug_db():
    try:
        conn = init_connection()
        results = {}
        
        with conn.cursor() as cur:
            # List all tables
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            tables = cur.fetchall()
            results['tables'] = [t[0] for t in tables]
            
            # Check if stock_analysis_all_results exists
            if ('stock_analysis_all_results',) in tables:
                # Get column info
                cur.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'stock_analysis_all_results'
                """)
                columns = cur.fetchall()
                results['columns'] = [{
                    'name': col[0], 
                    'type': col[1]
                } for col in columns]
                
                # Get sample data
                cur.execute("SELECT * FROM stock_analysis_all_results LIMIT 5")
                colnames = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                sample_data = []
                for row in rows:
                    sample_data.append({colnames[i]: row[i] for i in range(len(colnames))})
                results['sample_data'] = sample_data
                
                # Count records
                cur.execute("SELECT COUNT(*) FROM stock_analysis_all_results")
                count = cur.fetchone()[0]
                results['record_count'] = count
                
                # Check for null/zero values in important columns
                cur.execute("""
                    SELECT 
                        SUM(CASE WHEN closing_price IS NULL OR closing_price = 0 THEN 1 ELSE 0 END) as null_closing,
                        SUM(CASE WHEN turnover IS NULL OR turnover = 0 THEN 1 ELSE 0 END) as null_turnover,
                        COUNT(*) as total
                    FROM stock_analysis_all_results
                """)
                null_counts = cur.fetchone()
                results['null_counts'] = {
                    'closing_price': null_counts[0],
                    'turnover': null_counts[1],
                    'total_records': null_counts[2]
                }
        
        conn.close()
        return jsonify(results)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)})

@app.route('/technical-analysis')
def technical_analysis():
    try:
        # Log the request details for debugging
        print(f"[DEBUG] Received technical analysis request. Query params: {dict(request.args)}")
        
        conn = init_connection()
        with conn.cursor() as cur:
            # Query to get technical analysis data with date filter if provided
            date_filter = request.args.get('date')
            exact_date = request.args.get('exact_date', 'false').lower() == 'true'
            
            print(f"[DEBUG] Received date filter: {date_filter}, exact_date: {exact_date}")
            
            if date_filter:
                try:
                    # Parse the date to ensure it's in the correct format
                    # This will also raise an error if the date is invalid
                    parsed_date = pd.to_datetime(date_filter).strftime('%Y-%m-%d')
                    print(f"[DEBUG] Parsed date filter: {parsed_date}")
                    
                    if exact_date:
                        # Use DATE(date) = DATE(%s) for exact date match
                        query = """
                            SELECT * 
                            FROM stock_analysis_all_results
                            WHERE DATE(date) = DATE(%s)
                            ORDER BY date DESC, symbol ASC;
                        """
                        print(f"[DEBUG] Using EXACT date filter query")
                    else:
                        # Use DATE(date) >= DATE(%s) for date range
                        query = """
                            SELECT * 
                            FROM stock_analysis_all_results
                            WHERE DATE(date) >= DATE(%s)
                            ORDER BY date DESC, symbol ASC;
                        """
                        print(f"[DEBUG] Using date RANGE filter query")
                    
                    cur.execute(query, (parsed_date,))
                    
                    # Log number of rows fetched with the filter
                    print(f"[DEBUG] Executed query with date filter: {parsed_date}")
                except Exception as date_error:
                    print(f"[ERROR] Error parsing date parameter: {str(date_error)}")
                    # If date parsing fails, use default query
                    query = """
                        SELECT * 
                        FROM stock_analysis_all_results
                        WHERE date >= (CURRENT_DATE - INTERVAL '30 days')
                        ORDER BY date DESC, symbol ASC;
                    """
                    cur.execute(query)
            else:
                # Default query to get the last 30 days of data
                query = """
                    SELECT * 
                    FROM stock_analysis_all_results
                    WHERE date >= (CURRENT_DATE - INTERVAL '30 days')
                    ORDER BY date DESC, symbol ASC;
                """
                cur.execute(query)
                
            colnames = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            
            # Log the number of rows fetched
            print(f"[DEBUG] Fetched {len(rows)} rows from database")
        
        conn.close()
        
        # Convert to DataFrame for easier manipulation
        df = pd.DataFrame(rows, columns=colnames)
        print(f"[DEBUG] Loaded {len(df)} rows from stock_analysis_all_results table")
        
        # Check data types before conversion
        if 'closing_price' in df.columns:
            print(f"[DEBUG] closing_price dtype before conversion: {df['closing_price'].dtype}")
            print(f"[DEBUG] closing_price first 3 values: {df['closing_price'].head(3).tolist()}")
        
        if 'turnover' in df.columns:
            print(f"[DEBUG] turnover dtype before conversion: {df['turnover'].dtype}")
            print(f"[DEBUG] turnover first 3 values: {df['turnover'].head(3).tolist()}")
        
        # Explicitly convert numeric columns to ensure proper types
        numeric_cols = ['closing_price', 'change_pct', 'volume', 'turnover', 'rsi', 'relative_strength']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        # Check data types after conversion
        if 'closing_price' in df.columns:
            print(f"[DEBUG] closing_price dtype after conversion: {df['closing_price'].dtype}")
            print(f"[DEBUG] closing_price first 3 values after conversion: {df['closing_price'].head(3).tolist()}")
        
        if 'turnover' in df.columns:
            print(f"[DEBUG] turnover dtype after conversion: {df['turnover'].dtype}")
            print(f"[DEBUG] turnover first 3 values after conversion: {df['turnover'].head(3).tolist()}")
        
        # Properly convert the date column to datetime first, then format it
        if 'date' in df.columns:
            try:
                # Convert to datetime, handling any errors
                df['date'] = pd.to_datetime(df['date'], errors='coerce')
                
                # Filter out rows with invalid dates
                df = df.dropna(subset=['date'])
                
                # Now format dates as strings
                df['date'] = df['date'].dt.strftime('%Y-%m-%d')
            except Exception as date_error:
                print(f"[ERROR] Error formatting dates: {str(date_error)}")
                # If we can't process dates, convert them to strings directly
                df['date'] = df['date'].astype(str)
        
        # Handle NaN values
        # Replace any NaN values with None for proper JSON serialization
        df = df.replace({np.nan: None, float('inf'): None, float('-inf'): None})
        
        # Convert DataFrame to list of dictionaries
        result = df.to_dict(orient='records')
        
        # Log a sample of the resulting data
        if result:
            print(f"[DEBUG] Sample record - first row: {result[0]}")
        
        response = jsonify({
            'data': result
        })
        
        # Ensure CORS headers are set
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        
        return response
    except Exception as e:
        print(f"[ERROR] Error in technical_analysis endpoint: {str(e)}")
        traceback.print_exc()  # Print full stack trace for better debugging
        
        error_response = jsonify({'error': str(e), 'data': []})
        
        # Ensure CORS headers are set even for error responses
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        error_response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        error_response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        
        return error_response, 500

#-----------------------------------
# Main entry point
#-----------------------------------

if __name__ == '__main__':
    # Initialize the database on startup
    print("Starting unified application...")
    print("Initializing database...")
    init_database()
    print("Starting server...")
    app.run(host='0.0.0.0', port=5000, debug=True) 