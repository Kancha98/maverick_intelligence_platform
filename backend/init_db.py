import psycopg2
import os
import urllib.parse as urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def init_connection():
    db_url = os.environ.get("NEON_DB_URL")
    if not db_url:
        raise Exception("Database URL not found in environment variables!")
    url = urlparse.urlparse(db_url)
    return psycopg2.connect(
        database=url.path[1:],
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port or "5432"
    )

def init_database():
    try:
        conn = init_connection()
        print("Connected to database successfully.")
        
        # Create tables if they don't exist
        with conn.cursor() as cur:
            # Check if financial_metrics table exists
            cur.execute("""
                SELECT EXISTS (
                   SELECT FROM information_schema.tables 
                   WHERE table_name = 'financial_metrics'
                );
            """)
            table_exists = cur.fetchone()[0]
            
            if not table_exists:
                print("Creating financial_metrics table...")
                # Create financial_metrics table
                cur.execute("""
                    CREATE TABLE financial_metrics (
                        id SERIAL PRIMARY KEY,
                        code VARCHAR(20) NOT NULL,
                        eps_ttm NUMERIC,
                        bvps NUMERIC,
                        dps NUMERIC,
                        cum_np NUMERIC,
                        roe NUMERIC,
                        roa_ttm NUMERIC,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                
                # Insert some sample data for testing
                cur.execute("""
                    INSERT INTO financial_metrics (code, eps_ttm, bvps, dps, cum_np, roe, roa_ttm)
                    VALUES
                        ('AAF.N0000', 2.50, 15.75, 0.75, 1250000, 15.8, 8.2),
                        ('BALA.N0000', 1.85, 12.30, 0.50, 925000, 12.4, 6.5),
                        ('CIC.X0000', 3.20, 18.60, 1.00, 1580000, 17.2, 9.1),
                        ('ELPL.N0000', 1.65, 10.80, 0.40, 820000, 11.5, 5.8),
                        ('GRAN.N0000', 4.10, 22.50, 1.20, 2050000, 18.3, 9.8),
                        ('HBS.N0000', 2.30, 14.20, 0.65, 1150000, 14.2, 7.5),
                        ('LIOC.N0000', 5.40, 28.70, 1.50, 2700000, 19.5, 10.2),
                        ('LVEF.N0000', 1.95, 12.80, 0.55, 975000, 13.1, 6.9),
                        ('PARQ.N0000', 2.80, 16.40, 0.80, 1400000, 16.5, 8.8),
                        ('SDF.N0000', 2.15, 13.60, 0.60, 1075000, 13.8, 7.2),
                        ('SHOT.N0000', 3.50, 19.80, 1.10, 1750000, 17.8, 9.4),
                        ('UML.N0000', 2.05, 13.20, 0.58, 1025000, 13.5, 7.0),
                        ('AMF.N0000', 2.70, 16.10, 0.78, 1350000, 16.2, 8.6);
                """)
                
                conn.commit()
                print("Financial metrics table created and sample data inserted successfully.")
            else:
                print("Financial metrics table already exists.")
                
            # Check the existing columns
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'financial_metrics';
            """)
            columns = [row[0] for row in cur.fetchall()]
            print(f"Existing columns: {columns}")
            
        conn.close()
        print("Database initialization completed.")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    init_database() 