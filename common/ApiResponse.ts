class ApiResponse{
    constructor(statusCode, data, message ){
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
    }
    static success(statusCode,data,message = 'Success'){
        return new ApiResponse(statusCode, data, message);
    }
    static ok(statusCode,data,message = 'OK'){
        return new ApiResponse(statusCode, data, message);
    }
    static created(statusCode,data,message = 'Created'){
        return new ApiResponse(statusCode, data, message);
    }
    static updated(statusCode,data,message = 'Updated'){
        return new ApiResponse(statusCode, data, message);
    }
    static deleted(statusCode,data,message = 'Deleted'){
        return new ApiResponse(statusCode, data, message);
    }
}

export default ApiResponse;