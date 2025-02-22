import express from "express";

import EpRequests from "./requestFileEp.js";
const epRequests = new EpRequests();

import RequestsSales from "./requestForSales.js";
const salesRequests = new RequestsSales();

import CheckNewOrdersEpicenter from './customWebHook.js'
import { ComparisonObjects, CreateClientDataObj, createObjWithoutUserData } from "./marketplaceMethods.js";
import { CronJob } from 'cron';

const PORT = 8080;
const app = express();

app.use(express.json());

app.get('/', (_, res)=>{

    res.send('<h1> All ok!</h1>');
})

app.post('/api/cancel_order', async (req, res)=>{

    if(req.body.data.comment.includes('Ep'))
    {
        await epRequests.changeToCancel(req.body.data.utmContent, req.body.data.rejectionReason/1);
        res.status(200).json('Cancel ok!');
    }
    else
    res.status(200).json('Nah not Ep order!');
})

app.post('/api/cancel_by_customer', async(req, res)=>{

    const obj ={
        id: req.body.data.id,
        data: { salesdrive_manager: '3' }
    }
    await salesRequests.editOrder(obj);
    res.status(200).json('Auto Manager select -  ok!');
})

app.post('/api/save_declaration_id', async (req, res)=>{

    if(req.body.data.comment.includes('Ep'))
    {
        const epObj = await epRequests.getDataFromOrder(req.body.data.utmContent);
        const comprasion = ComparisonObjects(req.body, epObj);
        if(!comprasion.isSameDelivery)
        {

        }
        if(!comprasion.isSamePhone)
        {
            const phone = req.body.data.contacts[0].phone[0];
            const {firstName, lastName, email} =epObj.address;
            await epRequests.changeClientData(req.body.data.utmContent, {firstName, lastName, email, phone}); 
            console.log(`im here phone: ${phone}`);
        }
        
        let TTN;
        if(req.body.data.ord_delivery=='novaposhta')
        TTN=req.body.data.ord_novaposhta.EN;
        else
        TTN=req.body.data.ord_ukrposhta.barcode;
        epRequests.enteringTTN(req.body.data.utmContent, TTN); 

        res.status(200).json('save_declaration ok!');
    }
    else
    res.status(200).json('Nah not Ep order!');
})

app.post('/api/new_order', (req, res)=>{

    if(!req.body.data.comment.includes('Ep'))
    {
        const obj ={
            id: req.body.data.id,
            data: { statusId: '11' }
        }
        salesRequests.editOrder(obj);
        res.status(200).json('Change to proccesing -  ok!');
    }
    else
    res.status(200).json('Nah not Ep order!');
})

app.post('/api/processing_order', async (req, res)=>{

    if(req.body.data.comment.includes('Ep'))
    {
        await epRequests.changeToConfirmedByMerchant(req.body.data.utmContent);
        const epObj = await epRequests.getDataFromOrder(req.body.data.utmContent);
        
        const objForSales = CreateClientDataObj(epObj);
        objForSales.id = req.body.data.id;
        await salesRequests.editOrder(objForSales);
        res.status(200).json('Confirmed to merchant ok!');
    }
    else
    res.status(200).json('Nah not Ep order!');
})

app.post('/api/confirmed_order', async(req, res)=>{

    if(req.body.data.comment.includes('Ep'))
    {
        await epRequests.changeToConfirmed(req.body.data.utmContent);
        res.status(200).json('Confirmed ok!');
    }
    else
    res.status(200).json('Nah not Ep order!');
})

app.post('/api/new_order_ep', (req, res)=>{

    req.body.forEach(async(order) => {
        const epObj = await epRequests.getDataFromOrder(order);
        const objForSales = createObjWithoutUserData(epObj);
        salesRequests.addOrder(objForSales);
        res.status(200).json('new orders created ok!');
    })    

})

app.post('/api/miss_call', async (req, res)=>{

    if(req.body.data.comment.includes('Ep'))
    {
        await epRequests.changeCallStatus(req.body.data.utmContent, req.body.data.statusId/1);
        res.status(200).json('Change call status ok!');
    }
    else
    res.status(200).json('Nah not Ep order!');
})

     app.listen(PORT, ()=>console.log(`Server started! Port: ${PORT}`));
     setInterval(()=>{CheckNewOrdersEpicenter()}, 60000);

function StartJob()
{
    const job= new CronJob('0 0 */3 * * *', async function(){
        epRequests.regenerateToken();
    }, null, true, 'Europe/Kiev');
    job.start();
}
StartJob();