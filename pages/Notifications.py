import streamlit as st
import psycopg2
from urllib.parse import urlparse
import os

# --- Database Connection ---
# Use st.cache_resource for the database connection to reuse it across reruns
@st.cache_resource
def init_connection():
    """Initializes and caches the database connection."""
    # Attempt to get DB URL from Streamlit Secrets (deployment) or environment variables (local)
    db_url = st.secrets.get("NEON_DB_URL") or os.environ.get("NEON_DB_URL")

    if not db_url:
        st.error(
            "Database URL not found. Please configure Streamlit Secrets or NEON_DB_URL environment variable."
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
        st.error(f"Failed to connect to database: {e}")
        return None


def insert_user_data(conn, phone_number, username, index_value):
    """
    Inserts user phone number and username into the notification_ids table.
    Takes the database connection as an argument.
    """
    if conn is None:
        return False

    try:
        cursor = conn.cursor()
        # Check if the phone number already exists
        sql_check = "SELECT 1 FROM notification_ids WHERE phone_number = %s AND index_value = %s;"
        cursor.execute(sql_check, (phone_number, index_value))
        if cursor.fetchone():
            st.warning(
                f"Phone number +{index_value}{phone_number} already exists!"
            )
            return False

        # SQL query to insert data
        sql_insert = "INSERT INTO notification_ids (phone_number, username, index_value) VALUES (%s, %s, %s);"  # Added index_value to query
        cursor.execute(sql_insert, (phone_number, username, index_value))
        conn.commit()
        st.success(
            f"Successfully Subscribed! Lets Go!!. Phone Number: +{index_value}{phone_number}"
        )  # Show a success message
        return True
    except Exception as e:
        st.error(f"Error inserting data: {e}")
        return False
    finally:
        if conn:
            cursor.close()


def main():
    """
    Streamlit application to get user input and insert into the database.
    """
    st.title("Subscribe to our 'Intelligent Alerts' SMS Service")

    # Input fields for phone number and username
    st.write("Please enter your phone number and username to subscribe to our alerts.")
    index_value = st.text_input("Country Code (e.g., 94):")
    phone_number = st.text_input("Phone Number (e.g., 7712345):")
    username = st.text_input("Username:")

    # Get the database connection
    conn = init_connection()
    if conn is None:
        st.stop()

    # Button to trigger the data insertion
    if st.button("Submit"):
        if not phone_number or not username:
            st.warning("Please enter both phone number and username.")
        elif index_value == "94" and len(phone_number) != 9:
            st.warning(
                "Invalid phone number. For country code 94, the phone number must be 9 digits."
            )
        else:
            insert_user_data(conn, phone_number, username, index_value)


if __name__ == "__main__":
    main()
