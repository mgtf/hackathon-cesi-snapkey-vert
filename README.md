# Hackathon CESI x SNAPKEY, Équipe verte

## Installation

### Installer le script

Cloner le git et lancer un `$ npm install` pour être sûr d'avoir tous les modules

### Pour lancer

- Pour lancer le script, `$ node index.js`

## Paramètres

On aurait voulu permettre de mettre des arguments pour spécifier les paramètres, mais faute de temps, il faudra aller les changer directement dans le code !

### Paramètres de recherche

Normalement, les paramètres on des commentaires pour que vous puissiez les repérer.

```js
const PAGING = "10000"; // Le nombre d'items par page (garder HAUT)
const PAGE = "0"; // Le numéro de page (pas important)
const SORT = "0"; // Le paramètre de tri (pas important)
const WPO = "0"; // Seulement des items avec prix (ici à FAUX)
```

Les constantes PAGE et SORT ne sont pas importantes car :
- Le nombre de page sera normalement toujours à 0 si l'on garde un nombre d'item par page haut.
- Le SORT n'impacte pas le scraping

### Lancer la recherche

Le script est automatisé pour rechercher automatiquement tout (dans la fonction `main`), mais il est possible de modifier le code pour rechercher uniquement certains paramètres. Il suffira alors de mettre dans la fonction `main` toutes les requêtes que vous souhaitez faire.
```js
const ZPTID = {
  "bureau" : 1,
  "commerce" : 5
};

const TT = {
  "vente" : 0,
  "location" : 1,
  "cession" : 3
};

function requestProperty(zptid, tt, zipCode)
```

Il suffit d'entrer le ZPTID, le TT et le code postal que vous souhaitez pour lancer la bonne recherche. 

#### Exemples :
- Pour rechercher les bureaux en vente dans Paris, ce sera :
```js
requestProperty("bureau", "vente", "75")
```
- Pour rechercher les bureaux en location dans le 1er arrondissement de Paris, ce sera :
```js
requestProperty("bureau", "location", "75000")
```
- Pour rechercher les commerces en cession en France, laisser vide :
```js
requestProperty("commerces", "cession")
```

### Fonctionnement

La fonction renvoie une PROMISE (donc du code asynchrone), il faut donc la récupérer avec un "then" ou imbriquer l'appel de la fonction dans une fonction asynchrone. Cette promise renvoie ensuite un JSON.

#### Exemples :

- Récupération asynchrone :
```js
requestProperty("bureau", "vente", "75").then(function(json){
	// Votre code
})
```
- En forçant le synchrone :
```js
async function main(){
	var json = await requestProperty("bureau", "vente", "75");
}
main();
```

Pour chaque requête faite, il y a une barre de chargement qui sera affichée. Si par exemple vous faites trois requêtes imbriquées :
```js
requestProperty("bureau", "location").then(function() {
    requestProperty("commerce", "location").then(function() {
        requestProperty("commerce", "cession").then(function() {
            try {
                const parser = new Parser(opts);
                var jsonArray = Object.keys(finalJson).map(function(k) {
                    return finalJson[k]
                });
                const csv = parser.parse(jsonArray);
                var universalBOM = "\uFEFF";
                fs.writeFile(__dirname + "/csv/vert.csv", universalBOM + csv, function(err) {
                    if (err) {
                        return console.log(err);
                    }
                    console.log("The file was saved!");
                });
            } catch (err) {
                console.error(err);
            }
        });
    });
});
```

Cela vous afficher trois barres :

` ████████████████████████████████████████ 100% | ETA: 0s | 313/313`
` ████████████████████████████████████████ 100% | ETA: 0s | 5/5`
` ███████████████████████████████████░░░░░ 87.5% | ETA: 0s | 5/5`

## TODO

- Traduire les phrases en français
- **DEBUGGING**