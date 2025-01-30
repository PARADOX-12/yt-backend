class APiError extends Error {
    constructor(
        statusCode,
        message="Something went wrong",
        error =[],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data=null
        this.success = false;
        this.stack = stack
        this.error = error
    

    if (stack){
        this.stack = stack
    }
    else {
        Error.captureStackTrace(this, this.constructor)
    }
}

}

export {APiError}