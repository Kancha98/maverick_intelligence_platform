# home.py
import streamlit as st
from auth_utils import get_oauth_client, do_login, do_logout, get_authenticated_user

# Set the page configuration for the entire app
st.set_page_config(page_title="CSE Intelligence Platform", layout="wide")

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