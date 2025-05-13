import streamlit as st
import psycopg2  # Import the psycopg2 library
from urllib.parse import urlparse
import os

# Set the page configuration for the entire app
st.set_page_config(page_title="CSE Intelligence Platform", layout="wide")

from auth_utils import get_oauth_client, do_login, do_logout, get_authenticated_user

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
        
        /* Hide sidebar by default on mobile */
        [data-testid="stSidebar"] {
            display: none !important;
        }
        
        /* Action cards */
        .action-card {
            background-color: rgba(30, 33, 48, 0.8);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: transform 0.2s;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .action-card:active {
            transform: scale(0.98);
        }
        
        .action-card h4 {
            margin: 0 0 5px 0;
            font-size: 1rem;
        }
        
        .action-card p {
            margin: 0;
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.7);
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
        
        /* User profile card */
        .user-profile {
            display: flex;
            align-items: center;
            background-color: rgba(30, 33, 48, 0.5);
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 15px;
        }
        
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #4CAF50;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            font-weight: bold;
            color: white;
        }
        
        .user-info {
            flex: 1;
        }
        
        .user-name {
            font-weight: bold;
            font-size: 0.9rem;
        }
        
        .user-email {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.7);
        }
        
        /* Improved spacing */
        .block-container {
            padding-top: 1rem !important;
            padding-bottom: 6rem !important; /* Space for bottom nav */
        }
        
        /* Make buttons more touch-friendly */
        button, .stButton>button {
            min-height: 44px !important;
            min-width: 44px !important;
            padding: 10px 15px !important;
        }
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
    
    # Create clickable cards for each action
    st.markdown("""
    <a href="/cse_predictor" style="text-decoration: none; color: inherit;">
        <div class="action-card">
            <h4>📈 Stock Predictor</h4>
            <p>Discover high-potential stocks with AI-powered analysis</p>
        </div>
    </a>
    
    <a href="/technical_analysis" style="text-decoration: none; color: inherit;">
        <div class="action-card">
            <h4>📊 Technical Analysis</h4>
            <p>View detailed charts and technical indicators</p>
        </div>
    </a>
    
    <a href="/notifications" style="text-decoration: none; color: inherit;">
        <div class="action-card">
            <h4>🔔 Notifications</h4>
            <p>Stay updated with real-time alerts and notifications</p>
        </div>
    </a>
    
    <a href="/user_account" style="text-decoration: none; color: inherit;">
        <div class="action-card">
            <h4>👤 Account Settings</h4>
            <p>Manage your profile and preferences</p>
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
    
    # Compact footer
    st.markdown("""
    <div style="margin-top: 2rem; text-align: center; font-size: 0.8rem; color: rgba(255,255,255,0.6);">
        <p>🌟 Empowering your decisions with data-driven insights</p>
        <p style="margin-top: 0.5rem;">Powered by Maverick Intelligence Pvt Ltd</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Add logout button in a more accessible location
    if st.button("🚪 Logout", key="logout_button"):
        do_logout()
    
    # Bottom navigation for mobile
    st.markdown("""
    <div class="mobile-nav">
        <a href="/" class="nav-item active">
            <span class="nav-icon">🏠</span>
            <span>Home</span>
        </a>
        <a href="/cse_predictor" class="nav-item">
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