import streamlit as st
import psycopg2
from urllib.parse import urlparse
import os

# Set the page configuration for the entire app
st.set_page_config(page_title="CSE Intelligence Platform", layout="wide", page_icon="✨")

from auth_utils import get_oauth_client, do_login, do_logout, get_authenticated_user

# Hide Streamlit's default menu and footer
hide_streamlit_style = """
<style>
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
</style>
"""
st.markdown(hide_streamlit_style, unsafe_allow_html=True)

# Add custom CSS for clean, mobile-friendly design
st.markdown("""
<style>
    /* Base styles */
    body {
        color: white;
        background-color: #0e1117;
    }
    
    .main {
        padding: 0 !important;
    }
    
    .block-container {
        max-width: 1200px;
        padding-top: 1rem !important;
        padding-bottom: 5rem !important;
        margin: 0 auto;
    }
    
    h1, h2, h3, h4 {
        font-weight: 600;
    }
    
    /* Center content for login page */
    .login-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem 1rem;
        max-width: 600px;
        margin: 0 auto;
    }
    
    /* Feature cards */
    .feature-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-top: 2rem;
    }
    
    .feature-card {
        background-color: rgba(30, 33, 48, 0.8);
        border-radius: 12px;
        padding: 20px;
        transition: transform 0.2s, box-shadow 0.2s;
        border: 1px solid rgba(255, 255, 255, 0.1);
        height: 100%;
    }
    
    .feature-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }
    
    .feature-icon {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
    }
    
    .feature-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }
    
    .feature-description {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
    }
    
    /* User profile section */
    .user-profile {
        background-color: rgba(30, 33, 48, 0.5);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .user-header {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .user-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: #4CAF50;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
        font-weight: bold;
        font-size: 1.2rem;
    }
    
    .user-info {
        flex: 1;
    }
    
    .user-name {
        font-weight: bold;
        font-size: 1.1rem;
        margin-bottom: 0.2rem;
    }
    
    .user-email {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
    }
    
    /* Dashboard overview */
    .dashboard-overview {
        background-color: rgba(30, 33, 48, 0.5);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .overview-title {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
    }
    
    .overview-title-icon {
        margin-right: 0.5rem;
    }
    
    .overview-list {
        list-style-type: none;
        padding-left: 0.5rem;
    }
    
    .overview-list li {
        margin-bottom: 0.8rem;
        display: flex;
        align-items: center;
    }
    
    .overview-list-icon {
        margin-right: 0.5rem;
        font-size: 1.1rem;
    }
    
    /* Support section */
    .support-section {
        background-color: rgba(30, 33, 48, 0.5);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
    }
    
    .support-link {
        color: #4CAF50;
        text-decoration: none;
        font-weight: 600;
    }
    
    /* Footer */
    .footer {
        text-align: center;
        padding: 1rem;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.8rem;
        margin-top: 2rem;
    }
    
    /* Bottom navigation */
    .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #1a1f2c;
        display: flex;
        justify-content: space-around;
        padding: 10px 0;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        font-size: 0.7rem;
    }
    
    .nav-item.active {
        color: #4CAF50;
    }
    
    .nav-icon {
        font-size: 1.2rem;
        margin-bottom: 4px;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .feature-grid {
            grid-template-columns: 1fr;
        }
        
        .block-container {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
        }
    }
</style>
""", unsafe_allow_html=True)

# --- Authentication Check ---
oauth_client = get_oauth_client()
user_info = get_authenticated_user()

if not user_info:
    # User is not logged in, show login page
    st.markdown("""
    <div class="login-container">
        <h1>CSE Intelligence Platform</h1>
        <p style="margin-bottom: 2rem;">Your personalized analytics experience for the Colombo Stock Exchange</p>
        
        <div style="background-color: rgba(30, 33, 48, 0.8); border-radius: 12px; padding: 20px; margin-bottom: 2rem; border: 1px solid rgba(255, 255, 255, 0.1); width: 100%; max-width: 400px;">
            <p style="margin-bottom: 1rem;">🔒 Please log in to access the dashboards.</p>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Center the login button
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        do_login(oauth_client)  # This function handles the OAuth flow and reruns
    
    # Feature highlights
    st.markdown("""
    <div class="feature-grid">
        <div class="feature-card">
            <div class="feature-icon">📈</div>
            <div class="feature-title">Stock Predictor</div>
            <div class="feature-description">Discover high-potential stocks with AI-powered analysis and actionable insights.</div>
        </div>
        
        <div class="feature-card">
            <div class="feature-icon">📊</div>
            <div class="feature-title">Technical Analysis</div>
            <div class="feature-description">View detailed charts and technical indicators to make informed decisions.</div>
        </div>
        
        <div class="feature-card">
            <div class="feature-icon">🔔</div>
            <div class="feature-title">Real-time Alerts</div>
            <div class="feature-description">Stay updated with real-time notifications about market movements.</div>
        </div>
        
        <div class="feature-card">
            <div class="feature-icon">👤</div>
            <div class="feature-title">Personalized Experience</div>
            <div class="feature-description">Customize your dashboard and preferences for a tailored experience.</div>
        </div>
    </div>
    
    <div class="footer">
        <p>✨ Empowering your investment decisions with data-driven insights</p>
        <p>Powered by Maverick Intelligence Pvt Ltd</p>
    </div>
    """, unsafe_allow_html=True)

else:
    # User is logged in, display content for authenticated users
    user_email = user_info.get('email', 'N/A')
    user_name = user_info.get('name', 'User')
    
    # Welcome header
    st.markdown(f"""
    <h1 style="font-size: 1.8rem; margin-bottom: 1.5rem;">✨ Welcome to the CSE Intelligence Platform by Maverick 🚀</h1>
    """, unsafe_allow_html=True)
    
    # User profile section
    st.markdown(f"""
    <div class="user-profile">
        <div class="user-header">
            <div class="user-avatar">{user_name[0].upper()}</div>
            <div class="user-info">
                <div class="user-name">{user_name}</div>
                <div class="user-email">{user_email}</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Dashboard overview
    st.markdown("""
    <div class="dashboard-overview">
        <div class="overview-title">
            <span class="overview-title-icon">📊</span> Main Dashboard Overview
        </div>
        <p>Welcome to your personalized analytics hub! Here's what you can do:</p>
        <ul class="overview-list">
            <li><span class="overview-list-icon">📈</span> Explore dashboards for actionable insights</li>
            <li><span class="overview-list-icon">🔔</span> Stay updated with real-time notifications</li>
            <li><span class="overview-list-icon">⚙️</span> Manage your account and preferences</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)
    
    # Feature cards
    st.markdown("""
    <div class="feature-grid">
        <a href="/cse_predictor" style="text-decoration: none; color: inherit;">
            <div class="feature-card">
                <div class="feature-icon">📈</div>
                <div class="feature-title">Stock Predictor</div>
                <div class="feature-description">Discover high-potential stocks with AI-powered analysis.</div>
            </div>
        </a>
        
        <a href="/technical_analysis" style="text-decoration: none; color: inherit;">
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <div class="feature-title">Technical Analysis</div>
                <div class="feature-description">View detailed charts and technical indicators.</div>
            </div>
        </a>
        
        <a href="/notifications" style="text-decoration: none; color: inherit;">
            <div class="feature-card">
                <div class="feature-icon">🔔</div>
                <div class="feature-title">Notifications</div>
                <div class="feature-description">Stay updated with real-time alerts and notifications.</div>
            </div>
        </a>
        
        <a href="/user_account" style="text-decoration: none; color: inherit;">
            <div class="feature-card">
                <div class="feature-icon">👤</div>
                <div class="feature-title">Account Settings</div>
                <div class="feature-description">Manage your profile and preferences.</div>
            </div>
        </a>
    </div>
    """, unsafe_allow_html=True)
    
    # Support section
    st.markdown("""
    <div class="support-section">
        <p>🙏 If you find this information helpful, please consider</p>
        <a href="https://www.patreon.com/c/CSEMaverick" class="support-link">supporting me on Patreon</a> 💚
    </div>
    """, unsafe_allow_html=True)
    
    # Motivational footer
    st.markdown("""
    <div class="footer">
        <p>🌟 Empowering your decisions with data-driven insights</p>
        <p>🚀 Let's achieve greatness together!</p>
        <p style="margin-top: 0.5rem;">Powered by Maverick Intelligence Pvt Ltd</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Add logout button in a clean, accessible location
    col1, col2, col3 = st.columns([1, 1, 1])
    with col2:
        if st.button("🚪 Logout", key="logout_button"):
            do_logout()
    
    # Bottom navigation
    st.markdown("""
    <div class="bottom-nav">
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