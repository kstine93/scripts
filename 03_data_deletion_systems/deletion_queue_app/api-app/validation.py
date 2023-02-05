#Code to validate data flowing through the API

from marshmallow import Schema, fields, validate, ValidationError
import configparser

#----------------------
#---Configure Schema---
#----------------------
def get_config(path = '../deletion_app.cfg'):
    config = configparser.ConfigParser()
    config.read(path)
    return config

def get_config_data_specs():
    return get_config()['DATA_SPECS']



class Configured_Schema(Schema):
    config = None

    #----------------
    def __init__(self):
        #Setting global configurations for use in sub-classes
        config = configparser.ConfigParser()
        config.read('../deletion_app.cfg')
        self.config = config

#-------------------
#---Data Schemas:---
#-------------------
class NewRequestSchema(Configured_Schema):
    email = fields.Str(required=True)
    request_cause = fields.Str(required=True, validate=validate.OneOf([
        'direct_request'
        ,'account_deleted'
        ,'email_opt_out'
        ,'inactive'
        ,'other'
    ]))

#----------------
class EditPendingSchema(Configured_Schema):
    id = fields.Int(required=True)
    cause = fields.Str(validate=validate.OneOf(get_config_data_specs()['mutable_pending_fields']))

#----------------
class GetFinishedByDate(Configured_Schema):
    pass


#---------------------
#---Header Schemas:---
#---------------------
class AuthenticationHeaderSchema(Configured_Schema):
    #class to be implemented once we have authentication set up
    #Something maybe like "apiKey:xxx-xxx-xxx"
    pass