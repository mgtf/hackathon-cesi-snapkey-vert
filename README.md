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
const SEARCH = "75001"; // Le code postal à chercher
const PAGING = "10000"; // Le nombre d'items par page (garder HAUT)
const PAGE = "0"; // Le numéro de page (pas important)
const SORT = "0"; // Le paramètre de tri (pas important)
const WPO = "0"; // Seulement des items avec prix (ici à FAUX)
```

Les constantes PAGE et SORT ne sont pas importantes car :
- Le nombre de page sera normalement toujours à 0 si l'on garde un nombre d'item par page haut.
- Le SORT n'impacte pas le scraping

### Lancer la recherche

Le script est automatisé pour rechercher automatiquement tout (dans la fonction `test`), mais il est possible de modifier le code pour rechercher uniquement certains paramètres. Il suffira alors de mettre dans la fonction `test` toutes les requêtes que vous souhaitez faire.
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

function requestProperty(zptid, tt)
```

Il suffit d'entrer le ZPTID et le TT que vous souhaitez pour lancer la bonne recherche. Par exemple, pour rechercher les bureaux en vente, ce sera :
```js
requestProperty("bureau", "vente")
```
