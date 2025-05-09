import streamlit as st

# Set the page configuration
st.set_page_config(page_title="Stock Picking Tips", layout="wide")

# Page Title
st.title("📈 **How to Pick Stocks Like a Pro!** 💹")

# Introduction
st.markdown(
    """
    Welcome to the **Stock Picking Guide**! 🎯
    Whether you're a **seasoned investor** or just starting your journey, this page will help you understand the **art and science** of picking stocks using:
    - 🧮 **Fundamental Analysis**
    - 📊 **Technical Analysis**
    """
)

# Section 1: Fundamental Analysis
st.header("🧮 **Fundamental Analysis: The Detective Work** 🔍")
st.markdown(
    """
    Fundamental analysis is like being a **detective** for businesses. You're looking for **hidden gems** by analyzing a company's financial health and market position. Here's how you can do it:

    1. **Earnings Per Share (EPS):**
        - Think of EPS as the company's "report card." A higher EPS means the company is making more profit per share.
        - 🧐 *Look for consistent growth in EPS over time.*

    2. **Price-to-Earnings Ratio (P/E):**
        - This tells you how much you're paying for every dollar of earnings.
        - 📉 *A lower P/E might mean the stock is undervalued, but compare it to industry peers!*

    3. **Dividend Yield (DY):**
        - Love passive income? DY tells you how much return you're getting in dividends.
        - 💰 *Higher DY is great, but make sure the company can sustain it.*

    4. **Debt-to-Equity Ratio (D/E):**
        - A company with too much debt is like a ship with too much cargo—it might sink!
        - 🚢 *Look for a D/E ratio below 1 for safer investments.*

    5. **Return on Equity (ROE):**
        - This measures how efficiently a company uses your money to generate profits.
        - 🏆 *Higher ROE = Better management!*

    **Pro Tip:** Always compare these metrics with industry averages to get the full picture. 📊
    """
)

# Section 2: Technical Analysis
st.header("📊 **Technical Analysis: The Art of Timing** ⏳")
st.markdown(
    """
    Technical analysis is like being a **weather forecaster** for stocks. You're predicting future price movements based on past trends. Here's how to get started:

    1. **Support and Resistance Levels:**
        - Think of support as the "floor" and resistance as the "ceiling" for stock prices.
        - 🏗️ *Buy near support, sell near resistance.*

    2. **Moving Averages (MA):**
        - These smooth out price data to identify trends.
        - 📈 *A 50-day MA crossing above a 200-day MA is called a "Golden Cross"—a bullish signal!*

    3. **Relative Strength Index (RSI):**
        - RSI measures whether a stock is overbought or oversold.
        - ⚖️ *RSI above 70 = Overbought (sell); RSI below 30 = Oversold (buy).*

    4. **Candlestick Patterns:**
        - These patterns tell stories about market sentiment.
        - 🕯️ *Look for bullish patterns like "Hammer" or bearish patterns like "Shooting Star."*

    5. **Volume Analysis & Momentum:**
        - Volume confirms trends. A price increase with high volume = strong trend.
        - 🔊 *Beyond just volume, look for specific patterns:*
            - **High Bullish Momentum:** Strong buying pressure pushing prices up.
            - **Emerging Bullish Momentum:** Signs that buying pressure is starting to build.
            - **Increase in weekly Volume Activity Detected:** A notable jump in trading volume over the week, often preceding significant price moves.

    6. **RSI Divergence:**
        - This occurs when the price of an asset is moving in the opposite direction of the RSI indicator.
        - **Bullish Divergence:** Price makes a lower low, but RSI makes a higher low. This can signal that downward momentum is weakening and a price reversal might be coming (potential buy signal).
        - **Bearish Divergence:** Price makes a higher high, but RSI makes a lower high. This can signal that upward momentum is weakening and a price reversal might be coming (potential sell signal).

    7. **Turnover and Volume Thresholds:**
        - High turnover (the total value of shares traded) and high volume indicate strong market interest and liquidity in a stock. Stocks with significant trading activity are often more attractive for technical analysis as patterns are more reliable.

    **Pro Tip:** Combine multiple indicators for better accuracy. No single tool is perfect! 🛠️
    """
)

# Conclusion
st.markdown(
    """
    ---
    🎉 **Congratulations!** You're now equipped with the basics of **fundamental** and **technical analysis**.
    Remember, investing is a journey, not a sprint. Always do your research and stay informed. 📚

    🚀 *Happy investing, and may your portfolio always be in the green!* 💹
    """
)
