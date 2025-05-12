# home.py
import streamlit as st
import psycopg2  # Import the psycopg2 library
from urllib.parse import urlparse
import os
st.set_page_config(page_title="CSE Intelligence Platform", layout="wide")

from auth_utils import get_oauth_client, do_login, do_logout, get_authenticated_user

# Set the page configuration for the entire app


# Welcome Title
st.title("🌟 Welcome to the **CSE Intelligence Platform** by Maverick 🚀")

# --- Authentication Check ---
oauth_client = get_oauth_client()
user_info = get_authenticated_user()

if not user_info:
    # User is not logged in, show login button
    st.info("🔒 **Please log in to access the dashboards.**")
    st.markdown("👤 *Your personalized analytics experience awaits!*")
    do_login(oauth_client)  # This function handles the OAuth flow and reruns

else:
    # User is logged in, display content for authenticated users
    user_email = user_info.get('email', 'N/A')
    user_name = user_info.get('name', 'User')

    # Sidebar User Info
    st.sidebar.success(f"👋 **Welcome, {user_name}!**")
    st.sidebar.write(f"📧 **Email:** {user_email}")
    if st.sidebar.button("🚪 Logout"):
        do_logout()  # This function handles logout and reruns

    # Main Dashboard Content
    st.header("📊 **Main Dashboard Overview**")
    st.markdown(
        """
        Welcome to your **personalized analytics hub**! Here's what you can do:
        - 📈 **Explore dashboards** for actionable insights.
        - 🔔 **Stay updated** with real-time notifications.
        - 🛠️ **Manage your account** and preferences.
        """
    )
    
    st.markdown("""
---
🙏 If you find this information helpful and want to support my work, please consider [supporting me on Patreon](https://www.patreon.com/c/CSEMaverick) 💚
""")


    st.subheader("✨ **Your Google Account Details**")
    st.write(f"👤 **Name:** {user_name}")
    st.write(f"📧 **Email:** {user_email}")

    st.info("🌐 Use the **sidebar** on the left to navigate through the platform and unlock powerful insights!")

    # Add a motivational footer
    st.markdown(
        """
        ---
        🌟 *Empowering your decisions with data-driven insights.*  
        🚀 *Let's achieve greatness together!*
        """
    )
    
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

def insert_user_data(conn, phone_number, username):
    """
    Inserts user phone number and username into the notification_ids table.
    Takes the database connection as an argument.
    """
    if conn is None:
        return False  # Exit if the database connection failed

    try:
        cursor = conn.cursor()
        # SQL query to insert data
        sql = "INSERT INTO notification_ids (phone_number, username) VALUES (%s, %s);"
        cursor.execute(sql, (phone_number, username))
        conn.commit()
        st.success(f"Data inserted successfully for username: {username} and Phone Number: {phone_number}!")  # Show a success message
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
    st.title("Insert User Data")

    # Input fields for phone number and username
    phone_number = st.text_input("Phone Number:")
    username = st.text_input("Username:")

    # Get the database connection
    conn = init_connection()
    if conn is None:
        st.stop()  # Stop if the database connection fails

    # Button to trigger the data insertion
    if st.button("Insert Data"):
        if phone_number and username:  # check if both fields are not empty
            insert_user_data(conn, phone_number, username)
        else:
            st.warning("Please enter both phone number and username.")  # show warning



if __name__ == "__main__":
    main()
