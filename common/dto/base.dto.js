import Joi from "joi";
class BaseDto{
    static schema = Joi.object({})
    static validate(data){
        const {error, value} = this.schema.validate(data,{abortEarly:false, stripUnknown:false});
        if(error){
            const errorMsg = error.details.map(d=> d.message);
            return {data:null, error:errorMsg};
        }
        return {data:value,error:null};
    }
}
module.exports = BaseDto;