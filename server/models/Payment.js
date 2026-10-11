const mongoose=require("mongoose")

const paymentSchema=new mongoose.Schema({
    user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},
    provider:{type:String,enum:["paypal","upi"],required:true},
    kind:{type:String,enum:["pro_plan","fair_pay"],required:true},
    plan:{type:String,enum:["monthly","yearly"]},

    amount:{type:Number,required:true,min:0},
    currency:{type:String,required:true},
    amountInr:{type:Number},
    status:{
        type:String,
         enum: ["created", "approved", "captured", "pending_verification", "rejected", "failed", "refunded"],
          default:"created",
          index:true,
    },
    paypalOrderId:{type:String,unique:true,sparse:true},
    paypalCaptureId:{type:String,index:true,sparse:true},
    payerEmail:String,
    payerId:String,

    upi:{
        ixnRef:String,
        utr:String,
        vpa:String,
        payeeName:String,
    },
    metadata:{
        product:String,
        city:String,
        category:String,
        vendorName:String,
        guard:{
            verdict:String,
            scamProbability:Number,
            fairPriceMin:Number,
            fairPriceMax:Number,
        },
    },
    priceReport:{type:mongoose.Schema.Types.ObjectId,ref:"PriceReport"},
    fulfilledAt:Date,
},{timestamps:true})

paymentSchema.index({"upi.utr":1},{unique:true,sparse:true})

module.exports=mongoose.model("Payment",paymentSchema)