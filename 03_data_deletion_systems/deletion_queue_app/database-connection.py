
import configparser
import psycopg2
from psycopg2 import sql

class DatabaseConnection:
    db_conn = None
    db_cur = None
    config = None
    pending_table_name = "pending_requests"
    finished_table_name = "finished_requests"

    #----------------
    def __init__(self):
        self.set_config()
        self.connect_to_db()
        self.drop_tables()### ONLY FOR TESTING
        self.create_tables()
        self.add_new_by_email('test','test2')
        self.test_select()

    #----------------
    def test_select(self):
        self.db_cur.execute(f'''
            SELECT * FROM {self.pending_table_name}
        ''')
        self.db_conn.commit()
        print(self.db_cur.fetchone())
    #----------------
    def set_config(self):
        config = configparser.ConfigParser()
        config.read('deletion_app.cfg')
        self.config = config

    #----------------
    def connect_to_db(self):
        self.db_conn = psycopg2.connect("host={} dbname={} user={} password={}".format(*self.config['DATABASE'].values()))
        self.db_cur = self.db_conn.cursor()

    #----------------
    def drop_tables(self):
        self.db_cur.execute(f'''
            DROP TABLE IF EXISTS {self.pending_table_name}
        ''')

        self.db_cur.execute(f'''
            DROP TABLE IF EXISTS {self.finished_table_name}
        ''')

        self.db_conn.commit()

    #----------------
    def create_tables(self):
        #Note: I'm purposefully not adding 'IF NOT EXISTS' to these table creation commands
        #I find that if the tables need to be re-created, 'IF NOT EXISTS' can prove to be a bug.
        #I should instead find another way to check if the tables exist as a method of this class.
        self.db_cur.execute(f'''
            CREATE TABLE {self.pending_table_name} (
                id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY
                ,dt_requested TIMESTAMP DEFAULT NOW()
                ,email_address VARCHAR
                ,request_cause VARCHAR
                ,rejected BOOLEAN DEFAULT FALSE
            );
        ''')

        self.db_cur.execute(f'''
            CREATE TABLE {self.finished_table_name} (
                id bigint PRIMARY KEY
                ,dt_requested TIMESTAMP
                ,email_address VARCHAR
                ,request_cause VARCHAR
                ,rejected BOOLEAN
                ,dt_processed TIMESTAMP DEFAULT NOW()
            );
        ''')     

        self.db_conn.commit()  

    #----------------
    def add_new_by_email(self, email: str, cause: str):
        self.db_cur.execute(f'''
            INSERT INTO {self.pending_table_name}
                (email_address, request_cause) VALUES ('{email}','{cause}')
        ''')

        self.db_conn.commit()

    #----------------
    def edit_pending_by_id(id: int,**kwargs):
        #Requires ID to identify record, then iterate over kwargs to change values (only some values should be mutable)
        pass

    #----------------
    def get_finished():
        #Get all finished records
        pass

    #----------------
    def get_finished_by_date(startDate: str,endDate: str):
        #Return records filtered by date strings
        #How to enforce correct formatting (e.g., "2022-12-27")
        pass

test = DatabaseConnection()