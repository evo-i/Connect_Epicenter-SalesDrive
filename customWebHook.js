import sendRequest from "./features.js";
import fs from 'fs';
import { CreateHeaders } from "./requestFileEp.js";
const ourIp = fs.readFileSync('./data/currentIp.ini', 'utf-8');

function LoadLastOrder()
{
    let lastID = fs.readFileSync('./data/lastIDEpicenter.ini', 'utf-8');
    return lastID;
}

function SaveLastOrder(lastID)
{
    fs.writeFileSync('./data/lastIDEpicenter.ini', lastID);
}

export default async function SendCustomHook()
{
    
    let result = await sendRequest('GET', 'https://core-api.epicentrm.cloud/v2/oms/orders?filter%5BstatusCode%5D%5B%5D=new', null, CreateHeaders());

    if(result.items && result.items.length>0)
    {
        const arrIDs=result.items.map(item => item.number);
        let lastID = LoadLastOrder();
        if(lastID < arrIDs[0])
        {
            if(arrIDs.includes(lastID))
            {
                arrIDs.splice(arrIDs.indexOf(lastID), arrIDs.length-arrIDs.indexOf(lastID));
            }
            lastID = arrIDs[0];
            SaveLastOrder(lastID);
            const arrEncryptedID =[];
            arrIDs.forEach((_ , i) => {
                arrEncryptedID.push(result.items[i].id);
            });

            await sendRequest('POST', `${ourIp}:8080/api/new_order_ep`, arrEncryptedID);
        }
    }
}