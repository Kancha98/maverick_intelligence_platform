import streamlit as st
import pandas as pd
import psycopg2
import os
import urllib.parse as urlparse
import plotly.express as px
from dotenv import load_dotenv
from auth_utils import get_authenticated_user
from datetime import datetime

# --- Load environment variables ---
load_dotenv()

# Set the page configuration
st.set_page_config(page_title="CSE Predictor", layout="wide")

# Add custom CSS for mobile-friendly design
st.markdown("""
<style>
    /* Mobile-first styles */
    @media (max-width: 768px) {
        /* General Layout */
        .stApp {
            padding: 0.5rem !important;
        }
        
        /* Typography */
        h1 {
            font-size: 1.5rem !important;
            line-height: 1.3 !important;
            margin-bottom: 0.75rem !important;
        }
        
        h2, h3 {
            font-size: 1.25rem !important;
            margin-top: 1rem !important;
            margin-bottom: 0.5rem !important;
        }
        
        p, li {
            font-size: 0.9rem !important;
            line-height: 1.4 !important;
        }
        
        /* Tables */
        .stDataFrame {
            font-size: 0.8rem !important;
        }
        
        /* Cards for Stock Data */
        .stock-card {
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            background-color: rgba(30, 33, 48, 0.8);
            transition: transform 0.2s;
        }
        
        .stock-card:active {
            transform: scale(0.98);
        }
        
        .stock-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .stock-symbol {
            font-size: 1rem;
            font-weight: bold;
        }
        
        .stock-price {
            font-size: 1rem;
            font-weight: bold;
        }
        
        .positive-change {
            color: #2ecc71;
            font-weight: bold;
        }
        
        .negative-change {
            color: #e74c3c;
            font-weight: bold;
        }
        
        .stock-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 0.85rem;
        }
        
        .detail-label {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .detail-value {
            font-weight: bold;
        }
        
        /* Bottom Navigation */
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #1e2130;
            display: flex;
            justify-content: space-around;
            padding: 8px 0;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
            z-index: 1000;
        }
        
        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.7rem;
            padding: 5px 0;
        }
        
        .nav-item.active {
            color: #4CAF50;
        }
        
        .nav-icon {
            font-size: 1.2rem;
            margin-bottom: 2px;
        }
        
        /* Tabs for organizing content */
        .mobile-tabs {
            display: flex;
            overflow-x: auto;
            margin-bottom: 15px;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE and Edge */
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .mobile-tabs::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
        }
        
        .tab-button {
            background-color: transparent;
            border: none;
            padding: 8px 16px;
            white-space: nowrap;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        
        .tab-button.active {
            border-bottom-color: #4CAF50;
            color: white;
        }
        
        /* Hide sidebar by default on mobile */
        [data-testid="stSidebar"] {
            display: none !important;
        }
        
        /* Improved spacing */
        .block-container {
            padding-top: 1rem !important;
            padding-bottom: 6rem !important; /* Space for bottom nav */
        }
        
        /* Chart responsiveness */
        .js-plotly-plot, .plotly, .plot-container {
            max-width: 100% !important;
        }
        
        /* Make buttons more touch-friendly */
        button, .stButton>button {
            min-height: 44px !important;
            min-width: 44px !important;
            padding: 10px 15px !important;
        }
        
        /* Expandable sections */
        .expander {
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            margin-bottom: 10px;
            overflow: hidden;
        }
        
        .expander-header {
            background-color: rgba(30, 33, 48, 0.8);
            padding: 12px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .expander-content {
            padding: 12px;
            background-color: rgba(20, 23, 38, 0.8);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* Metrics cards */
        .metric-card {
            background-color: rgba(30, 33, 48, 0.5);
            border-radius: 8px;
            padding: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .metric-label {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 5px;
        }
        
        .metric-value {
            font-size: 1.2rem;
            font-weight: bold;
        }
        
        /* Disclaimer box */
        .disclaimer-box {
            background-color: rgba(255, 152, 0, 0.1);
            border: 1px solid rgba(255, 152, 0, 0.3);
            border-radius: 8px;
            padding: 12px;
            margin: 15px 0;
        }
        
        .disclaimer-title {
            color: #FFA000;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .disclaimer-text {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.9);
        }
    }
</style>
""", unsafe_allow_html=True)

# --- Authentication Check ---
user_info = get_authenticated_user()

# If user is not logged in, show a warning and stop execution of this page
if not user_info:
    st.warning("🔒 Please log in to view this page.\n\n👉 Visit the **Home Page** to log in and access this analytics dashboard.")
    st.stop() # This stops the script execution for this specific page

# --- Database Connection ---
@st.cache_resource
def init_connection():
    db_url = os.environ.get("NEON_DB_URL")
    if not db_url:
        st.error("Database URL not found in environment variables!")
        return None
    url = urlparse.urlparse(db_url)
    return psycopg2.connect(
        database=url.path[1:],
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port or "5432"
    )

# --- Load Data ---
@st.cache_data(ttl=600)
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

# --- Streamlit App ---
st.markdown("<h1 style='font-size: 1.5rem;'>📈 CSE Predictor</h1>", unsafe_allow_html=True)
st.markdown("<p>Your intelligent assistant for discovering high-potential stocks</p>", unsafe_allow_html=True)

# Use session state to track which tab is active
if 'active_tab' not in st.session_state:
    st.session_state.active_tab = 'picks'

# Custom tab navigation
st.markdown("""
<div class="mobile-tabs">
    <button class="tab-button active" id="tab-picks" onclick="setActiveTab('picks')">Picks</button>
    <button class="tab-button" id="tab-trends" onclick="setActiveTab('trends')">Trends</button>
    <button class="tab-button" id="tab-charts" onclick="setActiveTab('charts')">Charts</button>
    <button class="tab-button" id="tab-info" onclick="setActiveTab('info')">Info</button>
</div>

<script>
    // This JavaScript would handle tab switching in a real implementation
    // For Streamlit, we'll use session state instead
</script>
""", unsafe_allow_html=True)

# Tab buttons (since we can't use JavaScript in Streamlit)
col1, col2, col3, col4 = st.columns(4)
with col1:
    if st.button("Picks", use_container_width=True, key="tab_picks"):
        st.session_state.active_tab = 'picks'
with col2:
    if st.button("Trends", use_container_width=True, key="tab_trends"):
        st.session_state.active_tab = 'trends'
with col3:
    if st.button("Charts", use_container_width=True, key="tab_charts"):
        st.session_state.active_tab = 'charts'
with col4:
    if st.button("Info", use_container_width=True, key="tab_info"):
        st.session_state.active_tab = 'info'

# Add a button to force a data reload (clears cache)
if st.button("Reload Data", key="reload_button"):
    load_data.clear() # Clear the data cache
    init_connection.clear() # Clear the connection cache
    st.rerun() # Rerun the app immediately

try:
    df = load_data()

    if df.empty:
        st.warning("No data found in the table.")
        st.stop()

    # Remove unwanted columns
    df = df.drop(columns=[col for col in ['id'] if col in df.columns])
    
    # Apply filters
    filtered_df = df.copy()
    
    # Rename headers
    filtered_df.columns = [col.replace('_', ' ').title() for col in filtered_df.columns]

    numeric_columns = [
    'Closing Price', 'Prev Close', 'Turnover'
    ]
    
    for col in numeric_columns:
        if col in filtered_df.columns:
            filtered_df[col] = pd.to_numeric(filtered_df[col], errors='coerce')
    
    # Sort the table by Turnover in descending order
    if 'Turnover' in filtered_df.columns:
        filtered_df = filtered_df.sort_values(by='Turnover', ascending=False)
        
    # Format numeric values with commas
    for col in filtered_df.select_dtypes(include=['float64', 'int64']).columns:
        filtered_df[col] = filtered_df[col].apply(lambda x: f"{x:,.2f}" if isinstance(x, float) else f"{x:,}")

    filtered_df = filtered_df.drop(columns=[col for col in ['Vol Avg 5D','Vol Avg 20D', 'Ema 20', 'Ema 50', 'Ema 100', 'Ema 200', 'Last Updated'] if col in filtered_df.columns])
    
    # PICKS TAB CONTENT
    if st.session_state.active_tab == 'picks':
        if not filtered_df.empty:
            st.markdown("## 💎 Maverick's Potential Gems")
            
            # Add a date picker for filtering Maverick's Picks
            today = datetime.now()
            first_day_of_month = today.replace(day=1).date()
            
            selected_maverick_date = st.date_input(
                "Select Start Date",
                value=first_day_of_month, 
                min_value=filtered_df['Date'].min().date(),
                max_value=filtered_df['Date'].max().date()
            )
            
            # Ensure numeric columns are properly typed
            numeric_columns = [
                'Turnover', 'Volume', 'Relative Strength', 'Closing Price', 'Prev Close'
            ]
            for col in numeric_columns:
                if col in filtered_df.columns:
                    filtered_df[col] = pd.to_numeric(filtered_df[col], errors='coerce')
            
            # Filter data based on the selected date
            df['Date'] = pd.to_datetime(df['date'], errors='coerce')
            maverick_filtered_df = df[df['date'] >= pd.to_datetime(selected_maverick_date)]
            
            # Get Tier 1 and Tier 2 picks (using your existing function)
            def get_mavericks_picks(results_df):
                """Filters stocks for Mavericks Picks based on Tier 1 and Tier 2 conditions."""
                # Ensure numeric columns are properly typed
                for col in ['turnover', 'volume', 'relative_strength']:
                    if col in results_df.columns:
                        results_df[col] = pd.to_numeric(results_df[col], errors='coerce').fillna(0)
                
                tier_1_conditions = (
                    (results_df['rsi_divergence'] == "Bullish Divergence") &
                    (results_df['volume_analysis'].isin(["Emerging Bullish Momentum", "Increase in weekly Volume Activity Detected"]))
                ) & (
                    (results_df['turnover'] > 999999) &
                    (results_df['volume'] > 9999) &
                    (results_df['relative_strength'] >= 1)
                )

                tier_2_conditions = (
                    (results_df['volume_analysis'].isin(["Emerging Bullish Momentum", "High Bullish Momentum"]))&
                    (results_df['turnover'] > 999999) &
                    (results_df['volume'] > 9999) &
                    (results_df['relative_strength'] >= 1)
                ) | (
                    (results_df['rsi_divergence'] == "Bullish Divergence")&
                    (results_df['turnover'] > 999999) &
                    (results_df['volume'] > 9999) 
                )

                tier_1_picks = results_df[tier_1_conditions]
                tier_2_picks = results_df[tier_2_conditions]

                return tier_1_picks, tier_2_picks
            
            tier_1_picks, tier_2_picks = get_mavericks_picks(maverick_filtered_df)
            
            # Display Tier 1 Picks as cards instead of table
            st.markdown("### 🌟 Tier 1 Picks")
            if not tier_1_picks.empty:
                # Process tier 1 picks for display
                columns_to_remove = ['vol_avg_5d', 'vol_avg_20d']
                tier_1_picks = tier_1_picks.drop(columns=[col for col in columns_to_remove if col in tier_1_picks.columns])
                tier_1_picks = tier_1_picks.sort_values(by='date', ascending=False)
                
                # Display as cards
                for _, row in tier_1_picks.iterrows():
                    change_class = "positive-change" if row['change_pct'] > 0 else "negative-change" if row['change_pct'] < 0 else ""
                    change_prefix = "+" if row['change_pct'] > 0 else ""
                    
                    st.markdown(f"""
                    <div class="stock-card">
                        <div class="stock-header">
                            <div class="stock-symbol">{row['symbol']}</div>
                            <div class="stock-price">{row['closing_price']}</div>
                        </div>
                        <div class="stock-header">
                            <div class="detail-label">Change</div>
                            <div class="{change_class}">
                                {change_prefix}{row['change_pct']}%
                            </div>
                        </div>
                        <div class="stock-details">
                            <div class="detail-label">Volume</div>
                            <div class="detail-value">{row['volume']:,.0f}</div>
                            <div class="detail-label">RSI</div>
                            <div class="detail-value">{row['rsi']}</div>
                            <div class="detail-label">Momentum</div>
                            <div class="detail-value">{row['volume_analysis']}</div>
                            <div class="detail-label">Strength</div>
                            <div class="detail-value">{row['relative_strength']}</div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                st.info("No stocks meet Tier 1 conditions today.")
            
            # Display Tier 2 Picks
            st.markdown("### Tier 🔹 2 Picks")
            if not tier_2_picks.empty:
                # Process tier 2 picks for display
                columns_to_remove = ['vol_avg_5d', 'vol_avg_20d']
                tier_2_picks = tier_2_picks.drop(columns=[col for col in columns_to_remove if col in tier_2_picks.columns])
                tier_2_picks = tier_2_picks.sort_values(by=['date', 'turnover'], ascending=[False, False])
                
                # Display as cards (limited to 10 for mobile)
                for _, row in tier_2_picks.head(10).iterrows():
                    change_class = "positive-change" if row['change_pct'] > 0 else "negative-change" if row['change_pct'] < 0 else ""
                    change_prefix = "+" if row['change_pct'] > 0 else ""
                    
                    st.markdown(f"""
                    <div class="stock-card">
                        <div class="stock-header">
                            <div class="stock-symbol">{row['symbol']}</div>
                            <div class="stock-price">{row['closing_price']}</div>
                        </div>
                        <div class="stock-header">
                            <div class="detail-label">Change</div>
                            <div class="{change_class}">
                                {change_prefix}{row['change_pct']}%
                            </div>
                        </div>
                        <div class="stock-details">
                            <div class="detail-label">Volume</div>
                            <div class="detail-value">{row['volume']:,.0f}</div>
                            <div class="detail-label">RSI</div>
                            <div class="detail-value">{row['rsi']}</div>
                            <div class="detail-label">Momentum</div>
                            <div class="detail-value">{row['volume_analysis']}</div>
                            <div class="detail-label">Strength</div>
                            <div class="detail-value">{row['relative_strength']}</div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                
                # Add a "Show More" button if there are more than 10 stocks
                if len(tier_2_picks) > 10:
                    if st.button("Show More Tier 2 Picks"):
                        for _, row in tier_2_picks.iloc[10:].iterrows():
                            change_class = "positive-change" if row['change_pct'] > 0 else "negative-change" if row['change_pct'] < 0 else ""
                            change_prefix = "+" if row['change_pct'] > 0 else ""
                            
                            st.markdown(f"""
                            <div class="stock-card">
                                <div class="stock-header">
                                    <div class="stock-symbol">{row['symbol']}</div>
                                    <div class="stock-price">{row['closing_price']}</div>
                                </div>
                                <div class="stock-header">
                                    <div class="detail-label">Change</div>
                                    <div class="{change_class}">
                                        {change_prefix}{row['change_pct']}%
                                    </div>
                                </div>
                                <div class="stock-details">
                                    <div class="detail-label">Volume</div>
                                    <div class="detail-value">{row['volume']:,.0f}</div>
                                    <div class="detail-label">RSI</div>
                                    <div class="detail-value">{row['rsi']}</div>
                                    <div class="detail-label">Momentum</div>
                                    <div class="detail-value">{row['volume_analysis']}</div>
                                    <div class="detail-label">Strength</div>
                                    <div class="detail-value">{row['relative_strength']}</div>
                                </div>
                            </div>
                            """, unsafe_allow_html=True)
            else:
                st.info("No stocks meet Tier 2 conditions for the selected date.")
    
    # TRENDS TAB CONTENT
    elif st.session_state.active_tab == 'trends':
        st.markdown("## 📊 Mention Frequency Analysis")
        
        # Process the data for mention frequency analysis
        if not filtered_df.empty:
            st.markdown("### 🌱 Stocks in Early Bullish Phase")
            st.markdown("Stocks appearing **2-3 times** could signal the early phase of a bullish trend.")
            
            # Here you would process and display the early bullish phase stocks as cards
            # This is where you'd implement your existing code for mention frequency analysis
            # but displayed in a more mobile-friendly way
            
            # For example, if you have your recurring_stocks_1 dataframe:
            if 'recurring_stocks_1' in locals() and not recurring_stocks_1.empty:
                for _, stock in recurring_stocks_1.iterrows():
                    gain_class = "positive-change" if stock['% Gain'] > 0 else "negative-change" if stock['% Gain'] < 0 else ""
                    gain_prefix = "+" if stock['% Gain'] > 0 else ""
                    
                    st.markdown(f"""
                    <div class="stock-card">
                        <div class="stock-header">
                            <div class="stock-symbol">{stock['Symbol']}</div>
                            <div class="stock-price">{stock['Today_Price']}</div>
                        </div>
                        <div class="stock-header">
                            <div class="detail-label">Mentions</div>
                            <div class="detail-value">{stock['Mentions']} times</div>
                        </div>
                        <div class="stock-details">
                            <div class="detail-label">First Seen</div>
                            <div class="detail-value">{stock['First_Detected_Date'].strftime('%Y-%m-%d')}</div>
                            <div class="detail-label">First Price</div>
                            <div class="detail-value">{stock['First_Day_Price']}</div>
                            <div class="detail-label">% Gain</div>
                            <div class="{gain_class}">{gain_prefix}{stock['% Gain']}%</div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                # If you don't have the data yet, you can use this sample display
                early_bullish_stocks = [
                    {"Symbol": "ACAL.N0000", "Mentions": 3, "First_Date": "2025-05-06", "First_Price": 49.90, "Latest_Price": 50.80, "Gain": 1.80},
                    {"Symbol": "AGST.N0000", "Mentions": 2, "First_Date": "2025-05-07", "First_Price": 8.30, "Latest_Price": 8.30, "Gain": 0.00}
                ]
                
                for stock in early_bullish_stocks:
                    gain_class = "positive-change" if stock["Gain"] > 0 else "negative-change" if stock["Gain"] < 0 else ""
                    gain_prefix = "+" if stock["Gain"] > 0 else ""
                    
                    st.markdown(f"""
                    <div class="stock-card">
                        <div class="stock-header">
                            <div class="stock-symbol">{stock["Symbol"]}</div>
                            <div class="stock-price">{stock["Latest_Price"]}</div>
                        </div>
                        <div class="stock-header">
                            <div class="detail-label">Mentions</div>
                            <div class="detail-value">{stock["Mentions"]} times</div>
                        </div>
                        <div class="stock-details">
                            <div class="detail-label">First Seen</div>
                            <div class="detail-value">{stock["First_Date"]}</div>
                            <div class="detail-label">First Price</div>
                            <div class="detail-value">{stock["First_Price"]}</div>
                            <div class="detail-label">% Gain</div>
                            <div class="{gain_class}">{gain_prefix}{stock["Gain"]}%</div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
            
            st.markdown("### 🔥 Stocks in Strong Bullish Phase")
            st.markdown("Stocks with **4+ mentions** might be further into their uptrend.")
            
            # Display strong bullish phase stocks
            # Similar to above, use your existing data if available
            if 'recurring_stocks_2' in locals() and not recurring_stocks_2.empty:
                for _, stock in recurring_stocks_2.iterrows():
                    # Similar display code as above
                    pass
            else:
                # Sample display
                strong_bullish_stocks = [
                    {"Symbol": "AAF.N0000", "Mentions": 4, "First_Date": "2025-05-02", "First_Price": 32.30, "Latest_Price": 36.80, "Gain": 13.93}
                ]
                
                for stock in strong_bullish_stocks:
                    gain_class = "positive-change" if stock["Gain"] > 0 else "negative-change" if stock["Gain"] < 0 else ""
                    gain_prefix = "+" if stock["Gain"] > 0 else ""
                    
                    st.markdown(f"""
                    <div class="stock-card">
                        <div class="stock-header">
                            <div class="stock-symbol">{stock["Symbol"]}</div>
                            <div class="stock-price">{stock["Latest_Price"]}</div>
                        </div>
                        <div class="stock-header">
                            <div class="detail-label">Mentions</div>
                            <div class="detail-value">{stock["Mentions"]} times</div>
                        </div>
                        <div class="stock-details">
                            <div class="detail-label">First Seen</div>
                            <div class="detail-value">{stock["First_Date"]}</div>
                            <div class="detail-label">First Price</div>
                            <div class="detail-value">{stock["First_Price"]}</div>
                            <div class="detail-label">% Gain</div>
                            <div class="{gain_class}">{gain_prefix}{stock["Gain"]}%</div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
    
    # CHARTS TAB CONTENT
    elif st.session_state.active_tab == 'charts':
        st.markdown("## 📈 Stock Charts")
        
        # Simplified symbol selector for mobile
        if not filtered_df.empty:
            selected_chart_symbol = st.selectbox("Select Symbol", filtered_df['Symbol'].unique())
            chart_df = filtered_df[filtered_df['Symbol'] == selected_chart_symbol]
            
            # Ensure data is sorted by Date
            chart_df = chart_df.sort_values(by='Date')
            
            # Create a mobile-optimized chart
            fig = px.line(chart_df, 
                        x='Date', 
                        y='Closing Price', 
                        title=f"{selected_chart_symbol} Price Trend",
                        markers=True)
            
            fig.update_traces(line=dict(shape='linear'))
            fig.update_layout(
                height=300,  # Smaller height for mobile
                margin=dict(l=10, r=10, t=40, b=20),  # Tighter margins
                xaxis_title=None,  # Remove axis titles to save space
                yaxis_title=None,
                template="plotly_dark",
                xaxis=dict(
                    tickangle=-45,  # Angle the date labels
                    nticks=5  # Limit number of ticks for mobile
                )
            )
            st.plotly_chart(fig, use_container_width=True)
            
            # Add key metrics below the chart
            if not chart_df.empty:
                latest = chart_df.iloc[-1]
                cols = st.columns(2)
                with cols[0]:
                    st.markdown(f"""
                    <div class="metric-card">
                        <div class="metric-label">Current Price</div>
                        <div class="metric-value">{latest['Closing Price']}</div>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    st.markdown(f"""
                    <div class="metric-card">
                        <div class="metric-label">Volume</div>
                        <div class="metric-value">{latest['Volume']}</div>
                    </div>
                    """, unsafe_allow_html=True)
                
                with cols[1]:
                    st.markdown(f"""
                    <div class="metric-card">
                        <div class="metric-label">RSI</div>
                        <div class="metric-value">{latest['Rsi'] if 'Rsi' in latest else "N/A"}</div>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    st.markdown(f"""
                    <div class="metric-card">
                        <div class="metric-label">Rel. Strength</div>
                        <div class="metric-value">{latest['Relative Strength'] if 'Relative Strength' in latest else "N/A"}</div>
                    </div>
                    """, unsafe_allow_html=True)
    
    # INFO TAB CONTENT
    elif st.session_state.active_tab == 'info':
        st.markdown("## 📘 Key Terms & Information")
        
        # Use expanders for each section to save space
        with st.expander("📈 Relative Strength (RS)", expanded=False):
            st.markdown("""
            - A momentum indicator comparing stock performance to the market/ASI
            - **RS >= 1**: Stock outperforming the market
            - **RS < 1**: Stock underperforming the market
            """)
        
        with st.expander("🔄 Bullish Divergence", expanded=False):
            st.markdown("""
            - Occurs when price makes lower lows, but RSI makes higher lows
            - Potential signal for upside reversal
            """)
        
        with st.expander("📊 Volume Analysis", expanded=False):
            st.markdown("""
            - **Emerging Bullish Momentum**: Sudden increase in buying activity
            - **High Bullish Momentum**: Break-out buying activity
            - **Increase in Weekly Volume**: Gradual volume increase vs weekly average
            """)
        
        with st.expander("📐 EMAs (Exponential Moving Averages)", expanded=False):
            st.markdown("""
            - Moving averages weighted toward recent prices
            - **EMA 20**: Short-term trend
            - **EMA 50**: Medium-term trend
            - **EMA 100**: Long-term trend
            - **EMA 200**: Major support/resistance
            """)
        
        # Disclaimer section
        st.markdown("""
        <div class="disclaimer-box">
            <div class="disclaimer-title">⚠️ IMPORTANT DISCLAIMER: NOT FINANCIAL ADVICE</div>
            <div class="disclaimer-text">
                These results are for informational purposes only. Always conduct your own research and consult with a qualified financial advisor before making investment decisions.
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Support section
        st.markdown("### 🙏 Support This Project")
        st.markdown("""
        <div style="text-align: center; background-color: rgba(30, 33, 48, 0.5); border-radius: 8px; padding: 15px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <p style="margin-bottom: 10px;">If you find this information helpful, please consider</p>
            <a href="https://www.patreon.com/c/CSEMaverick" style="color: #4CAF50; font-weight: bold; font-size: 1.1rem;">supporting me on Patreon</a> 💚
        </div>
        """, unsafe_allow_html=True)

    # Bottom navigation for mobile
    st.markdown("""
    <div class="mobile-nav">
        <a href="/" class="nav-item">
            <span class="nav-icon">🏠</span>
            <span>Home</span>
        </a>
        <a href="/cse_predictor" class="nav-item active">
            <span class="nav-icon">📈</span>
            <span>Predictor</span>
        </a>
        <a href="/technical_analysis" class="nav-item">
            <span class="nav-icon">📊</span>
            <span>Technical</span>
        </a>
        <a href="/notifications" class="nav-item">
            <span class="nav-icon">🔔</span>
            <span>Alerts</span>
        </a>
        <a href="/user_account" class="nav-item">
            <span class="nav-icon">👤</span>
            <span>Account</span>
        </a>
    </div>
    """, unsafe_allow_html=True)

except Exception as e:
    st.error(f"An error occurred: {e}")