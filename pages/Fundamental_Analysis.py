import streamlit as st
import pandas as pd
# from tvDatafeed import TvDatafeed, Interval # Likely not needed for just displaying financial metrics
# from streamlit.components.v1 import html # Likely not needed
import psycopg2
import os
import urllib.parse as urlparse
# import plotly.express as px # Keep in case visualizations are added later, but not needed for basic display
from dotenv import load_dotenv
import datetime
from auth_utils import get_authenticated_user

# Load environment variables from .env file if it exists (for local development)
load_dotenv()

# --- Database Connection ---
# Use st.cache_resource for the database connection to reuse it across reruns
@st.cache_resource
def init_connection():
    """Initializes and caches the database connection."""
    # Attempt to get DB URL from Streamlit Secrets (deployment) or environment variables (local)
    db_url = st.secrets.get("NEON_DB_URL") or os.environ.get("NEON_DB_URL")

    if not db_url:
        st.error("Database URL not found. Please configure Streamlit Secrets or NEON_DB_URL environment variable.")
        return None

    try:
        url = urlparse.urlparse(db_url)
        conn = psycopg2.connect(
            database=url.path[1:], # [1:] to remove the leading slash
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port or "5432", # Default to 5432 if port is not specified
            sslmode="require", # Ensure SSL is used for Neon
        )
        st.success("Database connection established.")
        return conn
    except Exception as e:
        st.error(f"Failed to connect to database: {e}")
        return None

# --- Authentication Check ---
# This check is crucial for every page that requires authentication.
# If the user is not authenticated, get_authenticated_user() returns None.
user_info = get_authenticated_user()

# If user is not logged in, show a warning and stop execution of this page
if not user_info:
    st.warning("Please log in to view this page.")
    st.stop() # This stops the script execution for this specific page

# User is logged in, get their email (optional, but good practice)
user_email = user_info.get('email', 'N/A')
# st.write(f"Logged in as: {user_email}") # Optional: Display logged-in user

# --- Load Data ---
# Use `st.cache_data` for the dataframe result.
# It depends on the connection obtained from init_connection.
# TTL (Time To Live) determines how long the cache is valid (in seconds)
@st.cache_data(ttl=600) # Cache data for 10 minutes
def load_financial_metrics_data():
    """Loads financial metrics data from the database."""
    status_message = st.empty()
    status_message.text("Attempting to load financial metrics data...")

    # Get a connection from the cache. It will be created only once by init_connection
    # until the cache is cleared or arguments change.
    conn = init_connection()

    if conn is None:
        status_message.error("Cannot load data: Database connection failed.")
        return pd.DataFrame() # Return empty DataFrame if connection wasn't established

    # --- Add a try-except block for database operations ---
    try:
        # Use a cursor within a 'with' block to ensure it's closed properly
        with conn.cursor() as cur:
            status_message.text("Executing SQL query for financial metrics...")
            # *** MODIFIED: Select from financial_metrics table ***
            cur.execute("SELECT * FROM financial_metrics;")
            colnames = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

        status_message.success("Financial metrics data loaded successfully.")

        df = pd.DataFrame(rows, columns=colnames)

        # --- Handle Date Columns ---
        # Assuming 'report_date' is the primary date column for the metric
        if 'report_date' in df.columns:
             df['report_date'] = pd.to_datetime(df['report_date'], errors='coerce')
             # Ensure timezone-naive
             if pd.api.types.is_datetime64tz_dtype(df['report_date']):
                 df['report_date'] = df['report_date'].dt.tz_convert(None)
             df.dropna(subset=['report_date'], inplace=True) # Drop rows with invalid dates

        # Assuming 'last_updated' might still exist, showing when the row was last modified/fetched
        if 'last_updated' in df.columns:
             df['last_updated'] = pd.to_datetime(df['last_updated'], errors='coerce')
             # Ensure timezone-naive
             if pd.api.types.is_datetime64tz_dtype(df['last_updated']):
                 df['last_updated'] = df['last_updated'].dt.tz_convert(None)
             df.dropna(subset=['last_updated'], inplace=True) # Drop rows with invalid dates


        # Ensure numerical columns are correctly typed (optional but good practice)
        # Identify columns that look like numbers but aren't dates
        # This part might need tuning based on your financial_metrics schema
        numeric_cols = [col for col in df.columns if col not in ['code', 'company_name', 'report_date', 'last_updated'] and df[col].dtype == 'object']
        for col in numeric_cols:
             # Attempt to convert to numeric, coercing errors to NaN
             df[col] = pd.to_numeric(df[col], errors='coerce')


        return df

    except psycopg2.OperationalError as e:
        # This specific error often indicates connection problems (like being closed)
        status_message.error(f"Database Operational Error: {e}")
        st.info("Attempting to clear cached connection and reload.")
        # Clear the cached connection resource so init_connection will run again on rerun
        init_connection.clear()
        # Clear the data cache as well
        load_financial_metrics_data.clear()
        # Note: Streamlit reruns on user interaction or st.rerun(). Clearing the cache
        # means the next execution of this function will try to reconnect.
        return pd.DataFrame()

    except Exception as e:
        # Catch any other unexpected errors during data loading
        status_message.error(f"An unexpected error occurred while loading data: {e}")
        return pd.DataFrame()

# --- Streamlit App Layout ---
st.title("📊 Financial Metrics Dashboard") # Updated title

# Add a button to force a data reload (clears cache)
if st.button("Reload Financial Data"):
    # Clear both the data cache and the connection cache
    load_financial_metrics_data.clear()
    init_connection.clear()
    st.rerun() # Rerun the app immediately to fetch fresh data

# --- Display Data ---
try:
    # Load financial metrics data
    df_metrics = load_financial_metrics_data()

    if df_metrics.empty:
        st.info("Data could not be loaded or table is empty.")
    else:
        st.subheader("Filtered Financial Metrics")

        # Filter the metrics table to include only the required columns
        required_columns = ["code", "eps_ttm", "bvps", "dps", "cum_np", "roe", "da_ttm", "roa_ttm"]
        df_metrics = df_metrics[required_columns]

        # --- Query stock_analysis_all_results for closing_price ---
        conn = init_connection()
        if conn is None:
            st.error("Database connection failed. Cannot query stock_analysis_all_results.")
        else:
            try:
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
                    closing_price_df = pd.DataFrame(closing_price_data, columns=["symbol", "closing_price"])

                # Merge the metrics data with the closing price data
                df_combined = pd.merge(
                    df_metrics, closing_price_df,
                    left_on="code", right_on="symbol", how="left"
                )

                # Drop the redundant 'symbol' column after merging
                df_combined.drop(columns=["symbol"], inplace=True)
                
                df_combined['closing_price'] = df_combined['closing_price'].replace(0, pd.NA)

                # Calculate DY(%): dps / closing_price * 100
                df_combined['DY(%)'] = (df_combined['dps'] / df_combined['closing_price']) * 100

                # Calculate PER: eps_ttm / closing_price
                df_combined['PER'] = df_combined['eps_ttm'] / df_combined['closing_price']

                # Calculate PBV: bvps / closing_price
                df_combined['PBV'] = df_combined['bvps'] / df_combined['closing_price']

                # Display the resulting DataFrame
                st.dataframe(df_combined)

            except Exception as e:
                st.error(f"Error querying stock_analysis_all_results: {e}")

except Exception as e:
    st.error(f"An error occurred while processing or displaying data: {e}")


except Exception as e:
    # This catches errors that occur *after* load_financial_metrics_data runs
    st.error(f"An error occurred while processing or displaying data: {e}")