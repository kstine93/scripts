#Code to validate data flowing through the API

from marshmallow import Schema, fields, validate, ValidationError
import configparser

#----------------------
#---Configure Schema---
#----------------------
def get_config(path = 'deletion_app.cfg'):
    config = configparser.ConfigParser()
    config.read(path)
    return config

def get_config_data_specs():
    return get_config()['DATA_SPECS']

#-------------------
#---Data Schemas:---
#-------------------
class NewRequestSchema(Schema):
    email = fields.Str(required=True)
    request_cause = fields.Str(validate=validate.OneOf(
        get_config_data_specs()['request_causes'].split(",")
    ))

#----------------
class EditPendingSchema(Schema):
    request_cause = fields.Str(validate=validate.OneOf(
        get_config_data_specs()['request_causes'].split(",")
    ))
    rejected = fields.Str()

#----------------
class GetFinishedByDate(Schema):
    startDate = fields.Date(format="%Y-%m-%d")
    endDate = fields.Date(format="%Y-%m-%d")

#---------------------
#---Header Schemas:---
#---------------------
class AuthenticationHeaderSchema(Schema):
    #class to be implemented once we have authentication set up
    #Something maybe like "apiKey:xxx-xxx-xxx"
    pass