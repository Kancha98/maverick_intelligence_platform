from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from tvDatafeed  import TvDatafeed, Interval

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/latest-price/{symbol}")
async def get_latest_price(symbol: str):
    try:
        tv = TvDatafeed()
        index_data = tv.get_hist(
            symbol=symbol,
            exchange='CSELK',
            interval=Interval.in_daily,
            n_bars=10
        )
        
        if index_data is not None and 'close' in index_data and len(index_data['close']) > 0:
            return {"latestPrice": float(index_data['close'].iloc[-1])}
        
        raise HTTPException(status_code=404, detail="No data available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/api/ohlcv/{symbol}")
async def get_ohlcv(symbol: str):
    try:
        tv = TvDatafeed()
        index_data = tv.get_hist(
            symbol=symbol,
            exchange='CSELK',
            interval=Interval.in_daily,
            n_bars=200
        )
        if index_data is not None and not index_data.empty:
            # Prepare OHLCV data for charting
            ohlcv = []
            for idx, row in index_data.iterrows():
                ohlcv.append({
                    'date': idx.strftime('%Y-%m-%d'),
                    'open': float(row['open']),
                    'high': float(row['high']),
                    'low': float(row['low']),
                    'close': float(row['close']),
                    'volume': float(row['volume'])
                })
            return {"ohlcv": ohlcv}
        raise HTTPException(status_code=404, detail="No data available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 