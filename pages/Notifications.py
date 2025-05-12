import streamlit as st
import psycopg2
import os
from urllib.parse import urlparse
from auth_utils import get_authenticated_user # Import the authentication helper

# --- Authentication Check ---
# This check is crucial for every page that requires authentication.
user_info = get_authenticated_user()
if not user_info:
    # If the user is not logged in, show a warning and stop execution of this page
    st.warning("Please log in to view this page. 🔑")
    st.stop()  # This stops the script execution for this specific page


# --- Helper Functions ---
def create_connection():
    """Initializes and caches the database connection. 🔗"""
    db_url = st.secrets.get("NEON_DB_URL") or os.environ.get("NEON_DB_URL")
    if not db_url:
        st.error(
            "Database URL not found. Please configure Streamlit Secrets or NEON_DB_URL environment variable. ❌"
        )
        return None
    try:
        url = urlparse(db_url)
        conn = psycopg2.connect(
            database=url.path[1:],
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port or "5432",
            sslmode="require",
        )
        return conn
    except Exception as e:
        st.error(f"Failed to connect to database: {e} ⚠️")
        return None


@st.cache_resource
def init_connection():
    return create_connection()


def insert_user_data(conn, phone_number, username, index_value):
    """Inserts user data into the database. ✍️"""
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        sql_check = "SELECT 1 FROM notification_ids WHERE phone_number = %s AND index_value = %s;"
        cursor.execute(sql_check, (phone_number, index_value))
        if cursor.fetchone():
            st.warning(
                f"Phone number +{index_value}{phone_number} already exists! 📞"
            )
            return False
        sql_insert = (
            "INSERT INTO notification_ids (phone_number, username, index_value) VALUES (%s, %s, %s);"
        )
        cursor.execute(sql_insert, (phone_number, username, index_value))
        conn.commit()
        st.success(
            f"Successfully Subscribed! Lets Go!!. Phone Number: +{index_value}{phone_number} 🎉"
        )
        st.info(
            "🔔 Heads up!\n\nYou're on a 30-day free trial. To keep receiving timely stock alerts, subscribe to a plan.\n\nNeed help? Contact the Maverick Intelligence Team anytime!"
        )
        return True
    except Exception as e:
        st.error(f"Error inserting data: {e} ⚠️")
        return False
    finally:
        if conn:
            cursor.close()


# --- Main App Function ---
def main():
    """Streamlit application to subscribe users to SMS alerts. 🚀"""

    # --- Page Title and Header ---
    st.title("Intelligent Alerts SMS Service 🔔")
    st.markdown(
        """
        <style>
        h1 {
            color: #2c3e50;  /* Darker, more professional title color */
        }
        body {
            font-family: 'Arial', sans-serif;  /* More modern font */
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.write(
        "Stay informed with our Timely Intelligent Alerts! 📢 "
        "Please enter your phone number and username to subscribe. 📝"
    )

    # --- Input Fields with Improved Styling ---
    index_value = st.text_input(
        "Country Code (e.g., 94):",
        placeholder="Enter country code",  # Added placeholder
    )
    phone_number = st.text_input(
        "Phone Number (e.g., 7712345):",
        placeholder="Enter phone number",  # Added placeholder
    )
    username = st.text_input(
        "Username:",
        placeholder="Enter username",  # Added placeholder
    )

    # --- Input Validation and Database Interaction ---
    conn = init_connection()  # Get connection
    if st.button("Subscribe to Alerts 🚀"):  # Changed button text for clarity
        if not phone_number or not username or not index_value:
            st.warning("Please enter your country code, phone number, and username. ❌")
        elif index_value != "94":
            st.warning(
                "Service is only available for Sri Lankan phone numbers. Please contact Maverick Intelligence for other regions. 🌏"
            )
        elif len(phone_number) != 9:
            st.warning(
                "Invalid phone number.  Phone number must be 9 digits for Sri Lanka. 🔢"
            )
        else:
            insert_user_data(conn, phone_number, username, index_value)
        if conn:
            conn.close()

    # ---  Footer  ---
    st.markdown(
        """
        <style>
        footer {
            margin-top: 2em;
            text-align: center;
            color: #7f8c8d;  /* Muted footer text color */
            font-size: 0.9em;
            padding-top: 1em;
            border-top: 1px solid #e0e0e0; /* Subtle top border */
        }
        </style>
        <footer>
            Powered by Maverick Intelligence Pvt Ltd | mavrickintel.com
        </footer>
        """,
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
