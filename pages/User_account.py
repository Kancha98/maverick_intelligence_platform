import streamlit as st
import psycopg2  # Import the psycopg2 library
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
        st.error("Database URL not found. Please configure Streamlit Secrets or NEON_DB_URL environment variable.")
        return None

    try:
        url = urlparse(db_url)
        conn = psycopg2.connect(
            database=url.path[1:],  # [1:] to remove the leading slash
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port or "5432",  # Default to 5432 if port is not specified
            sslmode="require",  # Ensure SSL is used for Neon
        )
        # st.success("Database connection established.") # Removed success message for cleaner UI
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
        return False  # Exit if the database connection failed

    try:
        cursor = conn.cursor()
        # SQL query to insert data
        sql = "INSERT INTO notification_ids (phone_number, username, index_value) VALUES (%s, %s, %s);" # Added index_value to query
        cursor.execute(sql, (phone_number, username, index_value))
        conn.commit()
        st.success(f"Data inserted successfully for username: {username} and Phone Number: +{index_value}{phone_number}!")  # Show a success message
        return True  # Return True on Success
    except Exception as e:
        st.error(f"Error inserting data: {e}")  # Display the error in Streamlit
        return False  # Return False on Error
    finally:
        # Ensure the database connection is closed
        if conn:
            cursor.close()
            #DO NOT close the connection here.  The cached connection should remain open.
            #conn.close()

def main():
    """
    Streamlit application to get user input and insert into the database.
    """
    st.title("Subscribe to our Whatsapp Intelligent Alerts")

    # Input fields for phone number and username
    st.write("Please enter your phone number and username to subscribe to our alerts.")
    index_value = st.text_input("Country Code (e.g., 94):")
    phone_number = st.text_input("Phone Number(e.g., 7712345):")
    username = st.text_input("Username:")

    # Get the database connection
    conn = init_connection()
    if conn is None:
        st.stop()  # Stop if the database connection fails

    # Button to trigger the data insertion
    if st.button("Submit"):
        if phone_number and username:  # check if both fields are not empty
            insert_user_data(conn, phone_number, username, index_value)
        else:
            st.warning("Please enter both phone number and username.")  # show warning



if __name__ == "__main__":
    main()
