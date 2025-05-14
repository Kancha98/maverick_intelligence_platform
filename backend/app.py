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
        if isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
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
            grouped[d] = {
                'tier1Picks': t1.to_dict(orient='records'),
                'tier2Picks': t2.to_dict(orient='records')
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
        
        # Merge financial metrics with closing prices if we have a code column
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
            
            # Only calculate ratios if they don't already exist
            
            # Calculate DY(%): dps / closing_price * 100 if it doesn't exist
            if 'DY(%)' not in metrics_df.columns and 'dps' in metrics_df.columns and 'closing_price' in metrics_df.columns:
                metrics_df['DY(%)'] = pd.to_numeric(metrics_df['dps'], errors='coerce') / pd.to_numeric(metrics_df['closing_price'], errors='coerce') * 100
                metrics_df['DY(%)'] = metrics_df['DY(%)'].round(1)
            
            # Calculate PER if it doesn't exist
            if 'PER' not in metrics_df.columns and 'eps_ttm' in metrics_df.columns and 'closing_price' in metrics_df.columns:
                metrics_df['PER'] = pd.to_numeric(metrics_df['closing_price'], errors='coerce') / pd.to_numeric(metrics_df['eps_ttm'], errors='coerce')
                metrics_df['PER'] = metrics_df['PER'].round(1)
            
            # Calculate PBV if it doesn't exist
            if 'PBV' not in metrics_df.columns and 'bvps' in metrics_df.columns and 'closing_price' in metrics_df.columns:
                metrics_df['PBV'] = pd.to_numeric(metrics_df['closing_price'], errors='coerce') / pd.to_numeric(metrics_df['bvps'], errors='coerce')
                metrics_df['PBV'] = metrics_df['PBV'].round(1)
            
            # Add the latest close price column
            metrics_df['Latest Close Price'] = metrics_df['closing_price']
            
            # Clean up dataframe - drop unnecessary columns
            keep_columns = [
                'code', 'EPS(TTM)', 'Book Value Per Share', 'Dividend Per Share', 
                'Cumulative Net Profit', 'Return on Equity', 'Return on Assets',
                'Latest Close Price', 'PER', 'PBV', 'DY(%)'
            ]
            
            # Only keep columns that exist
            keep_columns = [col for col in keep_columns if col in metrics_df.columns]
            
            # Check we have the essential columns (code + at least one metric)
            if 'code' in keep_columns and len(keep_columns) > 1:
                metrics_df = metrics_df[keep_columns]
                
                # Replace NaN, infinity values with None for proper JSON serialization
                metrics_df.replace([float('inf'), float('-inf')], None, inplace=True)
                
                # Convert to records (list of dicts) for JSON serialization
                # Use pandas.DataFrame.where() to replace NaN with None
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
                            if isinstance(v, float) and (pd.isna(v) or pd.isinf(v) or math.isnan(v)):
                                clean_item[k] = None
                            else:
                                clean_item[k] = v
                        clean_metrics.append(clean_item)
                    metrics_data = clean_metrics
                    
                return jsonify({'metrics': metrics_data})
            else:
                return jsonify({
                    'metrics': [], 
                    'error': f"Missing essential columns. Found: {keep_columns}"
                })
        else:
            return jsonify({
                'metrics': [], 
                'error': f"'code' column not found in financial_metrics table. Available columns: {metrics_df.columns.tolist()}"
            })
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {str(e)}")
        return jsonify({'error': f"Database connection error: {str(e)}"}), 500
    except Exception as e:
        print(f"Error in fundamental_metrics: {str(e)}")
        import traceback
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
        import traceback
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
        import traceback
        traceback.print_exc()  # Print full stack trace for better debugging
        
        error_response = jsonify({'error': str(e), 'data': []})
        
        # Ensure CORS headers are set even for error responses
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        error_response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        error_response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        
        return error_response, 500

if __name__ == '__main__':
    app.run(port=5000, debug=True) 