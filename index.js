const requestString = "https://immobilier.cbre.fr/ui/listpage/properties.aspx?";
const https = require('https');
var HTMLParser = require('node-html-parser');
const cheerio = require('cheerio');
const { Parser } = require('json2csv');
const fs = require('fs');

const SEARCH = "75001"; // Le code postal à chercher
const PAGING = "10000"; // Le nombre d'items par page (pas important)
const PAGE = "0"; // Le numéro de page
const SORT = "0"; // Le paramètre de tri
const WPO = "0"; // Seulement des items avec prix (ici à FAUX)

const fields = ['name', 'address', 'zipCode', 'surface', 'price', 'disponibility', 'realPropertyType', "TransactionType", 'leaseAssignment'];
const opts = { keys: fields, delimiter : ";" };

var links = [];
var finalJson = {};
var isRequestOk = {};

const ZPTID = {
  "bureau" : 1,
  "commerce" : 5
};

const TT = {
  "vente" : 0,
  "location" : 1,
  "cession" : 3
};

//Requête de location/vente commerce/bureau
function requestProperty(zptid, tt){
  isRequestOk[requestString + constructGetParameters(zptid, tt)] = false
  https.get(requestString + constructGetParameters(zptid, tt) , (resp) => {
    let data = '';
    let typeDeBien = zptid
    let typeDeTransaction = tt

    // Une partie des données a été récupérée
    resp.on('data', (chunk) => {
      data += chunk;
    });

    // La réponse a été reçue en entière
    resp.on('end', () => {
      const $ = cheerio.load(data);
      $("a").each(function(){
        if(this.attribs.href && this.attribs.href.indexOf('.aspx') > -1) links.push(this.attribs.href);
      })
      links = [...new Set(links)];
      isRequestOk[requestString + constructGetParameters(zptid, tt)] = true
      asyncForLoop(links, typeDeBien, typeDeTransaction);
    });

  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}

function constructGetParameters(zptid, tt){
  return "ZPTID=" + ZPTID[zptid.toLowerCase()] + "&TT=" + TT[tt.toLowerCase()] + "&Paging=" + PAGING + "&Search=" + SEARCH + "&Page=" + PAGE + "&Sort=" + SORT + "&WPO=" + WPO + "&_=1582913933890"
}

// For loop avec des "await" pour ne pas saturer les requêtes. Risque de pendre un peu plus de temps, du coup.
async function asyncForLoop(array, typeDeBien, typeDeTransaction){
  for(var item of array){
    isRequestOk[item] = false;
    https.get(item, (resp) => {
      let url = "https://" + resp.socket._host + resp.socket.parser.outgoing.path;
      let ID = resp.socket.parser.outgoing.path.split('/')[resp.socket.parser.outgoing.path.split('/').length-1].split('.')[0]
      let data = '';

      // Une partie des données a été récupérée
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // La réponse a été reçue en entière
      resp.on('end', () => {
        if(typeof data !== "string") return;
        const $ = cheerio.load(data);

        var name = "";
        var address = "";
        var zipCode = "";
        var surface = "";
        var price = 0;
        var disponibility = "";
        var lease = ""

        // Récupérons les données
        name = $(".infos").find("h1")[0].children[0].data;
        surface = $(".infos-more.row").find("p")[0].children[1].data;
        price = $(".infos-more.row").find("p")[1].children[2].data;
        disponibility = $(".infos-more.row").find("p")[2].children[1].data;
        address = $(".infos").find("p")[0].children[0].data
        zipCode = address.split(' ');
        if(typeDeTransaction == "cession"){
          lease = $(".infos-more.row").find("p")[1].children[6];
          if(lease) lease = lease.data
          else lease = null
        }

        for(var word of zipCode){
          if(/(?:0[1-9]|[13-8][0-9]|2[ab1-9]|9[0-5])(?:[0-9]{3})?|9[78][1-9](?:[0-9]{2})?/.test(zipCode)) {
            zipCode = word;
            break;
          }
        }

        //Formattons-les
        if(surface.indexOf(':') > -1 && surface.indexOf('m²') > -1) surface = surface.substring(surface.indexOf(':')+2, surface.indexOf('m²')-1).trim()
        else surface = null
        var stringPrice = price;
        if(price.indexOf(':') > -1 && price.indexOf('€') > -1) price = price.substring(price.indexOf(':')+2, price.indexOf('€')-1).trim().split(' ').join('')
        else price = null
        if(typeDeTransaction == "cession" && lease !== null && lease.indexOf(':') > -1 && lease.indexOf('€') > -1) lease = lease.substring(lease.indexOf(':')+2, lease.indexOf('€')-1).trim().split(' ').join('')
        else lease = null
        if(disponibility.indexOf(':') > -1) disponibility = disponibility.substring(disponibility.indexOf(':')+2).trim()
        else disponibility = null

        if(price && stringPrice.indexOf("m²/an") == -1 && stringPrice.indexOf('€') > -1){
          price = Math.floor(parseFloat(price)/parseFloat(surface));
        }

        if(typeDeTransaction !== "cession")
          finalJson[ID] = {name : name, id : ID, address: address, zipCode : zipCode, surface : surface, price: price, disponibility : disponibility, realPropertyType : typeDeBien, TransactionType: typeDeTransaction}
        else
          finalJson[ID] = {name : name, id : ID, address: address, zipCode : zipCode, surface : surface, price: price, disponibility : disponibility, realPropertyType : typeDeBien, TransactionType: typeDeTransaction, leaseAssignment : lease}

        isRequestOk[url] = true;

        var arr = Object.keys(isRequestOk).map(function(k) { return isRequestOk[k] });
        if(arr.filter(element => element == false).length == 0){
          try {
            const parser = new Parser(opts);
            var jsonArray = Object.keys(finalJson).map(function(k) { return finalJson[k] });
            const csv = parser.parse(jsonArray);
            var universalBOM = "\uFEFF";
            fs.writeFile(__dirname + "/csv/result.csv", universalBOM+csv, function(err) {
              if(err) {
                return console.log(err);
              }
              console.log("The file was saved!");
            });
          } catch (err) {
            console.error(err);
          }
        }
      });

    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
  }
}

async function waitForRequest(){
  return new Promise(function(resolve, reject) {
    setTimeout(async function(){
      // Si toutes les requêtes sont terminées
      var arr = Object.keys(isRequestOk).map(function(k) { return isRequestOk[k] });
      if(arr.filter(element => element == false).length == 0){
        isRequestOk = {};
        resolve(finalJson);
      }else{
        await waitForRequest();
      }
    }, 1000)
  });
}

async function test(){
  requestProperty("bureau", "vente")
  requestProperty("bureau", "location")
  requestProperty("commerce", "vente")
  requestProperty("commerce", "location")
  requestProperty("commerce", "cession")
}

test();
