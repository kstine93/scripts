
import configparser
import psycopg2
from psycopg2 import sql
from datetime import datetime

class DatabaseConnection:
    db_conn: psycopg2.extensions.connection = None
    db_cur: psycopg2.extensions.cursor = None
    config: configparser.ConfigParser = None
    pending_table_name: str = None
    finished_table_name: str = None
    mutable_pending_fields: list[str] = None

    #----------------
    def __init__(self):
        self.set_config()
        self.connect_to_db()
        self.set_data_specs()
        # self.drop_tables()### ONLY FOR TESTING
        # self.create_tables()### ONLY FOR TESTING - I would prefer to keep all table setup in another structure.
        # self.add_new_by_email('test','test2')
        # self.test_select()

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
    def close_db_conn(self):
        self.db_conn.close()

    #----------------
    def set_data_specs(self):
        self.pending_table_name = self.config['DATA_SPECS']['pending_table_name']
        self.finished_table_name = self.config['DATA_SPECS']['finished_table_name']
        #Configparser (apparently) cannot read lists. Expects string: value1,value2,value3
        self.mutable_pending_fields = self.config['DATA_SPECS']['mutable_pending_fields'].split(",")

    #----------------
    def drop_tables(self):
        self.db_cur.execute(f"DROP TABLE IF EXISTS {self.pending_table_name}")
        self.db_cur.execute(f"DROP TABLE IF EXISTS {self.finished_table_name}")
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

        #If no fields provided to edit, raise error:
        if len(fields) == 0:
            raise ValueError("Error: No field provided to update.")
        #If user attempts to change any other fields, throw error
        excess_fields = set(fields.keys()) - set(self.mutable_pending_fields)
        if (len(excess_fields)) > 0:
            raise ValueError(f"Error: Cannot change the provided fields: {list(excess_fields)}\n")
        else:
            self.update_table(
                table=self.pending_table_name
                ,fields=fields
                ,cond_col = "id"
                ,cond_val = id
            )

    #----------------
    def update_table(self, table: str, fields: dict, cond_col: str, cond_val: str):
        #generic method to update table based on provided key-value pairs and condition
        #Note: Returning rows so that we can see if any matching ID was found:
        query = sql.SQL("UPDATE {table} SET {fields} WHERE {cond_col} = {cond_val} RETURNING {cond_col}").format(
            table = sql.Identifier(table)
            ,fields = sql.SQL(', ').join(
                sql.Composed([sql.Identifier(key), sql.SQL(" = "), sql.Placeholder(key)]) for key in fields.keys()
            )
            ,cond_col = sql.Identifier(cond_col)
            ,cond_val = sql.Literal(int(cond_val))
        )
        self.db_cur.execute(query, fields)
        
        #If we found matching rows to update, commit changes. If no rows updated, rollback changes and raise error.
        result = self.db_cur.fetchall()
        if len(result) > 0:
            self.db_conn.commit()
        else:
            self.db_conn.rollback()
            raise ValueError("No matching rows found - update aborted.")

    #----------------
    def get_pending(self):
        query = sql.SQL("SELECT * FROM {table}")
        query = query.format(table = sql.Identifier(self.pending_table_name))

        self.db_cur.execute(query)
        return self.db_cur.fetchall()

    #----------------
    def get_finished(self):
        query = sql.SQL("SELECT * FROM {table}")
        query = query.format(table = sql.Identifier(self.finished_table_name))

        self.db_cur.execute(query)
        return self.db_cur.fetchall()

    #----------------
    def get_finished_by_date(self, startDate: str = "1970-01-01", endDate: str = datetime.now().strftime("%Y-%m-%d")):

        query = sql.SQL("SELECT * FROM {table} WHERE dt_processed BETWEEN {startDate} AND {endDate}")
        query = query.format(
            table = sql.Identifier(self.finished_table_name)
            ,startDate = sql.Literal(startDate)
            ,endDate = sql.Literal(endDate)
            )

        self.db_cur.execute(query)
        return self.db_cur.fetchall()