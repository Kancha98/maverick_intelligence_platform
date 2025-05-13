import streamlit as st
import psycopg2  # Import the psycopg2 library
from urllib.parse import urlparse
import os

# Set the page configuration for the entire app
st.set_page_config(page_title="CSE Intelligence Platform", layout="wide")

from auth_utils import get_oauth_client, do_login, do_logout, get_authenticated_user

# Add custom CSS for mobile-friendly design
# Add this to the top of your home.py file, replacing the current CSS section

# Add custom CSS for mobile-friendly design - with !important flags to override defaults
st.markdown("""
<style>
    /* Mobile-first styles with !important to ensure they take precedence */
    .stApp {
        padding: 0.5rem !important;
    }
    
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
    
    /* Action cards */
    .action-card {
        background-color: rgba(30, 33, 48, 0.8) !important;
        border-radius: 8px !important;
        padding: 15px !important;
        margin-bottom: 10px !important;
        cursor: pointer !important;
        transition: transform 0.2s !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        display: block !important;
    }
    
    .action-card:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
    }
    
    .action-card h4 {
        margin: 0 0 5px 0 !important;
        font-size: 1rem !important;
    }
    
    .action-card p {
        margin: 0 !important;
        font-size: 0.85rem !important;
        color: rgba(255, 255, 255, 0.7) !important;
    }
    
    /* Bottom Navigation - Fixed positioning */
    .mobile-nav {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        background-color: #1e2130 !important;
        display: flex !important;
        justify-content: space-around !important;
        padding: 8px 0 !important;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2) !important;
        z-index: 9999 !important;
    }
    
    .nav-item {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        color: rgba(255, 255, 255, 0.7) !important;
        font-size: 0.7rem !important;
        padding: 5px 0 !important;
        text-decoration: none !important;
    }
    
    .nav-item.active {
        color: #4CAF50 !important;
    }
    
    .nav-icon {
        font-size: 1.2rem !important;
        margin-bottom: 2px !important;
    }
    
    /* User profile card */
    .user-profile {
        display: flex !important;
        align-items: center !important;
        background-color: rgba(30, 33, 48, 0.5) !important;
        border-radius: 8px !important;
        padding: 10px !important;
        margin-bottom: 15px !important;
    }
    
    .user-avatar {
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        background-color: #4CAF50 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-right: 10px !important;
        font-weight: bold !important;
        color: white !important;
    }
    
    .user-info {
        flex: 1 !important;
    }
    
    .user-name {
        font-weight: bold !important;
        font-size: 0.9rem !important;
    }
    
    .user-email {
        font-size: 0.8rem !important;
        color: rgba(255, 255, 255, 0.7) !important;
    }
    
    /* Make buttons more touch-friendly */
    button, .stButton>button {
        min-height: 44px !important;
        min-width: 44px !important;
        padding: 10px 15px !important;
    }
    
    /* Add padding at the bottom for the fixed navigation */
    .main .block-container {
        padding-bottom: 70px !important;
    }
</style>
""", unsafe_allow_html=True)

# --- Authentication Check ---
oauth_client = get_oauth_client()
user_info = get_authenticated_user()

if not user_info:
    # User is not logged in, show login button
    st.markdown("<h1 style='text-align: center; margin-top: 2rem;'>CSE Intelligence Platform</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center;'>Your personalized analytics experience for the Colombo Stock Exchange</p>", unsafe_allow_html=True)
    
    # Center the login button
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.info("🔒 Please log in to access the dashboards.")
        do_login(oauth_client)  # This function handles the OAuth flow and reruns

else:
    # User is logged in, display content for authenticated users
    user_email = user_info.get('email', 'N/A')
    user_name = user_info.get('name', 'User')
    
    # Compact header
    st.markdown("<h1 style='font-size: 1.5rem;'>CSE Intelligence Platform</h1>", unsafe_allow_html=True)
    
    # User profile card (mobile-friendly)
    st.markdown(f"""
    <div class="user-profile">
        <div class="user-avatar">{user_name[0].upper()}</div>
        <div class="user-info">
            <div class="user-name">{user_name}</div>
            <div class="user-email">{user_email}</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Action cards instead of bullet points
    st.markdown("<h3>Quick Actions</h3>", unsafe_allow_html=True)
    
    # Replace the action cards section with this code

# Create columns for each action card to ensure proper layout
col1, col2 = st.columns(2)
with col1:
    st.markdown("""
    <a href="/cse_predictor" style="text-decoration: none; color: inherit;">
        <div class="action-card">
            <h4>📈 Stock Predictor</h4>
            <p>Discover high-potential stocks</p>
        </div>
    </a>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    <a href="/notifications" style="text-decoration: none; color: inherit;">
        <div class="action-card">
            <h4>🔔 Notifications</h4>
            <p>Stay updated with alerts</p>
        </div>
    </a>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <a href="/technical_analysis" style="text-decoration: none; color: inherit;">
        <div class="action-card">
            <h4>📊 Technical Analysis</h4>
            <p>View detailed charts</p>
        </div>
    </a>
    
    <a href="/user_account" style="text-decoration: none; color: inherit;">
        <div class="action-card">
            <h4>👤 Account Settings</h4>
            <p>Manage your profile</p>
        </div>
    </a>
    """, unsafe_allow_html=True)
    
    # Patreon support section
    st.markdown("""
    <div style="margin-top: 1.5rem; text-align: center; background-color: rgba(30, 33, 48, 0.5); border-radius: 8px; padding: 10px; border: 1px solid rgba(255, 255, 255, 0.1);">
        <p style="margin-bottom: 0.5rem;">🙏 If you find this information helpful, please consider</p>
        <a href="https://www.patreon.com/c/CSEMaverick" style="color: #4CAF50; font-weight: bold;">supporting me on Patreon</a> 💚
    </div>
    """, unsafe_allow_html=True)
    
# Add this at the end of your home.py file

# Create a container div with fixed height to ensure content isn't hidden behind the nav bar
st.markdown('<div style="height: 60px;"></div>', unsafe_allow_html=True)

# Bottom navigation with inline styles
st.markdown("""
<div style="position: fixed; bottom: 0; left: 0; right: 0; background-color: #1e2130; display: flex; justify-content: space-around; padding: 8px 0; box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2); z-index: 9999;">
    <a href="/" style="display: flex; flex-direction: column; align-items: center; color: #4CAF50; font-size: 0.7rem; padding: 5px 0; text-decoration: none;">
        <span style="font-size: 1.2rem; margin-bottom: 2px;">🏠</span>
        <span>Home</span>
    </a>
    <a href="/cse_predictor" style="display: flex; flex-direction: column; align-items: center; color: rgba(255, 255, 255, 0.7); font-size: 0.7rem; padding: 5px 0; text-decoration: none;">
        <span style="font-size: 1.2rem; margin-bottom: 2px;">📈</span>
        <span>Predictor</span>
    </a>
    <a href="/technical_analysis" style="display: flex; flex-direction: column; align-items: center; color: rgba(255, 255, 255, 0.7); font-size: 0.7rem; padding: 5px 0; text-decoration: none;">
        <span style="font-size: 1.2rem; margin-bottom: 2px;">📊</span>
        <span>Technical</span>
    </a>
    <a href="/notifications" style="display: flex; flex-direction: column; align-items: center; color: rgba(255, 255, 255, 0.7); font-size: 0.7rem; padding: 5px 0; text-decoration: none;">
        <span style="font-size: 1.2rem; margin-bottom: 2px;">🔔</span>
        <span>Alerts</span>
    </a>
    <a href="/user_account" style="display: flex; flex-direction: column; align-items: center; color: rgba(255, 255, 255, 0.7); font-size: 0.7rem; padding: 5px 0; text-decoration: none;">
        <span style="font-size: 1.2rem; margin-bottom: 2px;">👤</span>
        <span>Account</span>
    </a>
</div>
""", unsafe_allow_html=True)