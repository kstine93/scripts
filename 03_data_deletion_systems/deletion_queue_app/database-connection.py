
import configparser
import psycopg2
from psycopg2 import sql

class DatabaseConnection:
    db_conn = None
    db_cur = None
    config = None

    def __init__(self):
        self.set_config()
        self.connect_to_db()
        self.create_tables()

    def set_config(self):
        config = configparser.ConfigParser()
        config.read('deletion_app.cfg')
        self.config = config

    def connect_to_db(self):
        self.db_conn = psycopg2.connect("host={} dbname={} user={} password={}".format(*self.config['DATABASE'].values()))
        self.db_cur = self.db_conn.cursor()

    def create_tables(self):
        pass

    def add_new_by_email(self, email: str, cause: str):
        db_conn = self.db_conn
        pass

    def edit_pending_by_id(id: int,**kwargs):
        #Requires ID to identify record, then iterate over kwargs to change values (only some values should be mutable)
        pass

    def get_finished():
        #Get all finished records
        pass

    def get_finished_by_date(startDate: str,endDate: str):
        #Return records filtered by date strings
        #How to enforce correct formatting (e.g., "2022-12-27")
        pass

test = DatabaseConnection()