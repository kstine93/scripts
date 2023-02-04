
import configparser
import psycopg2
from psycopg2 import sql

class DatabaseConnection:
    db_conn = None
    db_cur = None
    config = None
    pending_table_name = "pending_requests"
    finished_table_name = "finished_requests"
    mutable_pending_fields = ['request_cause','rejected']

    #----------------
    def __init__(self):
        self.set_config()
        self.connect_to_db()
        # self.drop_tables()### ONLY FOR TESTING
        # self.create_tables()### ONLY FOR TESTING - I would prefer to keep all table setup in another structure.
        # self.add_new_by_email('test','test2')
        # self.test_select()

    #----------------
    def test_select(self):
        self.db_cur.execute(f'''
            SELECT * FROM {self.pending_table_name}
        ''')
        self.db_conn.commit()
        print(self.db_cur.fetchall())

    #----------------
    def set_config(self):
        config = configparser.ConfigParser()
        config.read('deletion_app.cfg')
        self.config = config

    #----------------
    def connect_to_db(self):
        conn_string = "host={} dbname={} user={} password={}"
        self.db_conn = psycopg2.connect(conn_string.format(*self.config['DATABASE_ACCESS'].values()))
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
        query = sql.SQL('''INSERT INTO {table}
            (email_address, request_cause) VALUES ({email},{cause})
        ''')
        
        query = query.format(
            table = sql.Identifier(self.pending_table_name)
            ,email = sql.Literal(email)
            ,cause = sql.Literal(cause)
        )
        self.db_cur.execute(query)
        self.db_conn.commit()

    #----------------
    def edit_pending_by_id(self, id: int, **fields):
        #Requires ID to identify record, then iterate over kwargs to change values (only some values should be mutable)
        #1. Read Kwargs
        #2. If user attempts to change any other fields, throw error
        excess_fields = set(fields.keys()) - set(self.mutable_pending_fields)
        print(excess_fields)
        if (len(excess_fields) > 0):
            raise Exception("Cannot change the provided fields")
        else:
            self.update_table(
                table=self.pending_table_name
                ,fields=fields
                ,condition=f"WHERE id = {id}"
            )

    #----------------
    # REQUIRES TESTING!!
    def update_table(self, table: str, fields: dict, condition: str):
        #generic method to update table based on provided key-value pairs and condition
        query = sql.SQL("UPDATE {table} SET {fields} {condition}").format(
            table = sql.Identifier(table)
            ,fields = sql.SQL(', ').join(
                sql.Composed([sql.Identifier(key), sql.SQL(" = "), sql.Placeholder(key)]) for key in fields.keys()
            )
            ,condition = sql.Literal(condition)
        )
        self.db_cur.execute(query, fields)
        self.db_conn.commit()

    #----------------
    def get_pending(self):
        #NEEDS TESTING! Standardize return data format (JSON)
        query = sql.SQL("SELECT * FROM {table}")
        query = query.format(table = sql.Identifier(self.pending_table_name))

        self.db_cur.execute(query)
        return self.db_cur.fetchall()

    #----------------
    def get_finished(self):
        #NEEDS TESTING! Standardize return data format (JSON)
        query = sql.SQL("SELECT * FROM {table}")
        query = query.format(table = sql.Identifier(self.finished_table_name))

        self.db_cur.execute(query)
        return self.db_cur.fetchall()

    #----------------
    def get_finished_by_date(self, startDate: str,endDate: str):
        query = "SELECT * FROM {table} WHERE dt_processed BETWEEN {startDate} AND {endDate}"
        query = query.format(
            table = sql.Identifier(self.finished_table_name)
            ,startDate = sql.Identifier(startDate)
            ,endDate = sql.Identifier(endDate)
            )

        self.db_cur.execute(query)
        return self.db_cur.fetchall()

db = DatabaseConnection()
db.edit_pending_by_id(id='test_id',**{'rejocted':'True'})