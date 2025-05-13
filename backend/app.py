from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import psycopg2
import os
import urllib.parse as urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
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
                (group['volume_analysis'].isin(["Emerging Bullish Momentum", "Increase in weekly Volume Activity Detected"])) &
                (group['relative_strength'] >= 1)
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

if __name__ == '__main__':
    app.run(port=5000, debug=True) 