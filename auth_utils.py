import streamlit as st
from streamlit_oauth import OAuth2
import yaml
import os
import requests
import json
import base64
from datetime import datetime, timedelta
from streamlit_js_eval import streamlit_js_eval

# ─────────────────────────────────────────────────────────────
# 🔒 Helper Functions for Cookie Management
# ─────────────────────────────────────────────────────────────

def set_cookie(name, value, days=1):
    """Set a cookie using JS and postMessage."""
    encoded = base64.b64encode(json.dumps(value).encode()).decode()
    expire_date = (datetime.utcnow() + timedelta(days=days)).strftime("%a, %d %b %Y %H:%M:%S GMT")

    # Using JS Eval to set the cookie
    streamlit_js_eval(f"""
        document.cookie = "{name}={encoded}; path=/; expires={expire_date}; SameSite=Lax";
        window.parent.postMessage({{streamlitCookieSet: true}}, "*");
    """)

def get_cookie(name):
    """Trigger browser to read the cookie and post back to parent."""
    # Using JS Eval to get the cookie
    streamlit_js_eval(f"""
        const cookieName = "{name}";
        const cookies = document.cookie.split("; ");
        const cookie = cookies.find(row => row.startsWith(cookieName + "="));
        const value = cookie ? cookie.split('=')[1] : "";
        window.parent.postMessage({{streamlitCookie: value}}, "*");
    """)

def clear_cookie(name):
    """Clear cookie by setting it to expire in the past."""
    # Using JS Eval to clear the cookie
    streamlit_js_eval(f"""
        document.cookie = "{name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.reload();
    """)

# ─────────────────────────────────────────────────────────────
# 👤 User Authentication Logic
# ─────────────────────────────────────────────────────────────

def decode_cookie_value():
    """Insert JS to fetch the cookie and trigger decode on first app load."""
    if 'cookie_checked' not in st.session_state:
        st.session_state.cookie_checked = False
        st.session_state.user_info = None

        # Setup listener for decoding
        streamlit_js_eval("""
        window.addEventListener("message", (event) => {
            if (event.data?.streamlitCookie) {
                const payload = event.data.streamlitCookie;
                window.parent.postMessage({streamlitCookieDecoded: payload}, "*");
            }
        });
        """)

        get_cookie("user_info")


def handle_cookie_callback():
    """Decode and load cookie value into session state."""
    if not st.session_state.get("cookie_checked"):
        event = st.experimental_get_query_params().get("streamlitCookieDecoded", [None])[0]
        if event:
            try:
                decoded = json.loads(base64.b64decode(event))
                st.session_state.user_info = decoded
            except:
                st.session_state.user_info = None
        st.session_state.cookie_checked = True  
    
    return st.session_state.get("user_info")

def get_oauth_client():
    """
    Initializes and returns the OAuth2 client using configuration from config.yaml
    and secrets from environment variables or Streamlit's secrets.toml.
    """
    CONFIG_FILE = 'config.yaml'

    # Load config.yaml
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            config = yaml.safe_load(f)
        oauth_config = config.get('oauth')
        if not oauth_config:
            st.error("OAuth configuration not found under the 'oauth' key.")
            st.stop()
    else:
        st.error(f"Configuration file '{CONFIG_FILE}' not found.")
        st.stop()

    # Load client secret
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", st.secrets.get("GOOGLE_CLIENT_SECRET"))
    if not client_secret:
        st.error("Google Client Secret not found.")
        st.stop()

    # Create OAuth2 client
    return OAuth2(
        client_id=oauth_config['client_id'],
        client_secret=client_secret,
        authorize_endpoint=oauth_config['auth_endpoint'],  # Map to authorize_endpoint
        access_token_endpoint=oauth_config['token_endpoint'],  # Map to access_token_endpoint
    )

# Initialize the OAuth client
oauth_client = get_oauth_client()


def do_login(oauth_client):
    """
    Handles the login process using Google OAuth.
    Returns user info if logged in.
    """
    # 1. Check if user is already logged in via session state
    if 'user_info' in st.session_state and st.session_state.get('logged_in', False):
        return st.session_state['user_info']
    

    # 2. Load configuration needed for login flow (scopes, redirect_uri, user_info_endpoint)
    # Read config inside the function if it's needed here and not fully loaded globally
    CONFIG_FILE = 'config.yaml'
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = yaml.safe_load(f)
        oauth_config = config.get('oauth')
        if not oauth_config:
             st.error("OAuth configuration not found under the 'oauth' key during login.")
             return None # Stop login process
        scope = oauth_config.get('scope')
        redirect_uri = oauth_config.get('redirect_uri')
        user_info_endpoint = oauth_config.get('user_info_endpoint')

        if not all([scope, redirect_uri, user_info_endpoint]):
             st.error("Missing required OAuth configuration details (scope, redirect_uri, or user_info_endpoint) in config.yaml.")
             return None # Stop login process

    except FileNotFoundError:
        st.error(f"Configuration file '{CONFIG_FILE}' not found during login.")
        return None # Stop login process
    except Exception as e:
         st.error(f"Error loading configuration during login: {e}")
         return None # Stop login process


    # 3. Construct the authorization URL
    # Using the endpoints/client_id from the initialized oauth_client object
    auth_url = (
        f"{oauth_client.authorize_endpoint}?"
        f"response_type=code&"
        f"client_id={oauth_client.client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope}"
    )

    # 4. Display the login button using st.link_button
    # This button directly navigates the user to the auth_url
    st.info("Please log in to access the dashboards.") # Moved info message here
    st.link_button("Login with Google", url=auth_url)
    # You can optionally add a small instruction text
    # st.write("Click the button above to log in with your Google account.")


    # 5. Handle the authorization response AFTER the redirect from Google
    # This block executes on a rerun when the 'code' query parameter is present
    if "code" in st.query_params:
        
        code_value = st.query_params.get("code") # Get the value associated with 'code'

        # Check if the value is a list (standard behavior) or a string (observed behavior)
        if code_value is not None:
            if isinstance(code_value, list) and len(code_value) > 0:
                code = code_value[0] # Get the first item if it's a non-empty list
            elif isinstance(code_value, str) and len(code_value) > 0:
                 code = code_value # Use the string directly if it's a non-empty string
                 
        if code:
            try:
                # Debugging: Print the token request data (exclude client_secret!)
                st.write("DEBUG: Token Request Data:", {
                    "code": code,
                    "client_id": oauth_client.client_id,
                    # "client_secret": oauth_client.client_secret, # DO NOT PRINT IN PRODUCTION!
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                })
                st.write(f"DEBUG: Extracted code: {code}") # Debug print from previous step

                # Exchange the authorization code for an access token
                token_response = requests.post(
                    oauth_client.access_token_endpoint,
                    data={
                        "code": code,
                        "client_id": oauth_client.client_id,
                        "client_secret": oauth_client.client_secret, # Use secret here
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                token_response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
                token_data = token_response.json()
                access_token = token_data.get("access_token")
                # Optionally store refresh_token if needed for long-lived sessions
                # refresh_token = token_data.get("refresh_token")

                if not access_token:
                    st.error("Failed to retrieve access token from token exchange.")
                    st.write("DEBUG: Token response:", token_data) # Print response for debugging
                    return None

                # Fetch user info using the access token
                user_info_response = requests.get(
                    user_info_endpoint,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                user_info_response.raise_for_status() # Raise HTTPError for bad responses
                user_info = user_info_response.json()
                
                # Then set the cookie
                set_cookie("user_info", user_info)

                # Store user info and login status in session state
                st.session_state['user_info'] = user_info
                st.session_state['logged_in'] = True
                st.success("Successfully authenticated!") # Show success message
                
                # ✅ Set cookie after successful login
                set_cookie("user_info", user_info)
                st.success(f"✅ Logged in as {user_info['name']}")

                # --- Clear query parameters AFTER successful login ---
                # This removes the 'code' from the URL after it's used
                st.query_params.clear()
                # -------------------------------------------------

                # Rerun the app to transition to the logged-in state UI
                st.rerun()
                return user_info

            except requests.exceptions.HTTPError as e:
                st.error(f"HTTP Error during token exchange or user info fetch: {e}")
                # Specific error handling for 400 Bad Request from token endpoint
                if e.response.status_code == 400:
                     st.error("Token exchange failed. This often means the authorization code was invalid, expired, or the redirect_uri/credentials do not match.")
                     st.write("DEBUG: Response body:", e.response.text) # Print response body for more details

            except Exception as e:
                st.error(f"An unexpected error occurred during the login process: {e}")

        else:
            # 'code' param was in query_params but was empty or not a list
            st.error("Invalid 'code' parameter received in the redirect URL.")
            st.write("DEBUG: st.query_params['code'] value:", code_value)

    return None # Return None if not logged in and no code to process

def do_logout():
    """
    Clears the login session.
    """
    st.session_state.pop('user_info', None)
    st.session_state.pop('logged_in', None)
    st.rerun()

def get_authenticated_user():
    """
    Retrieves authenticated user info from session.
    """
    oauth_client = get_oauth_client()
    decode_cookie_value()
    user_info = handle_cookie_callback()  # ✅ Use this instead of calling itself

    return st.session_state.get('user_info') if st.session_state.get('logged_in') else None


# === Main execution ===

user_info = get_authenticated_user()

if not user_info:
    do_login(oauth_client)
else:
    user_email = user_info.get('email', 'N/A')
    user_name = user_info.get('name', 'User')

    st.sidebar.write(f"Logged in as: {user_name} ({user_email})")
    if st.sidebar.button("Logout"):
        do_logout()

    st.header("Main Dashboard Overview")
    st.write("Welcome to your secure dashboard, powered by Google OAuth.")
