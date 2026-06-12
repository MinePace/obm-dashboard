# StoreTime Dashboard Prototype

## Over het project

Dit project is ontwikkeld als onderdeel van een schoolopdracht in samenwerking met OBM voor de StoreTime-pilot in Centrum Nieuw-Vennep.

Het doel van dit prototype is om campagnegegevens inzichtelijk te maken voor zowel ondernemers als centrummanagement. Tijdens de pilot bleek dat de bestaande StoreTime-omgeving beperkte mogelijkheden bood voor het analyseren van campagneprestaties. Daarom is een dashboardconcept ontwikkeld dat laat zien hoe campagnegegevens kunnen worden omgezet naar bruikbare managementinformatie.

Het dashboard is ontwikkeld als prototype en dient als concept voor mogelijke toekomstige implementatie binnen het StoreTime-platform.

---

## Doelstellingen

Het dashboard heeft als doel om:

* Inzicht te geven in campagneprestaties.
* Ondernemers inzicht te geven in de prestaties van hun eigen winkel.
* Centrummanagement inzicht te geven in de prestaties van de volledige campagne.
* Data om te zetten naar bruikbare managementinformatie.
* Nieuwe visualisaties en KPI's te testen voor toekomstige implementatie binnen StoreTime.

---

## Technologie

Het prototype is ontwikkeld met:

* React
* TypeScript
* Vite

Hoewel StoreTime momenteel gebruikmaakt van Angular voor de frontend, is gekozen voor React vanwege bestaande ervaring met dit framework. Hierdoor kon sneller een werkend prototype worden ontwikkeld.

De gebruikte componentstructuur en dashboardlogica kunnen relatief eenvoudig worden vertaald naar een Angular-implementatie.

---

## Dashboardstructuur

Het dashboard bestaat uit twee hoofdonderdelen:

### Organisatie Layer

Deze omgeving is bedoeld voor:

* OBM
* Centrummanagement
* Campagnebeheerders

Voorbeelden van beschikbare inzichten:

* Totaal uitgegeven prijzen
* Totaal opgehaalde prijzen
* Redeem Rate
* Leeftijdsverdeling
* Geslachtsverdeling
* Prestaties per ondernemer
* Campagnetrends

---

### Ondernemer Layer

Deze omgeving is bedoeld voor individuele ondernemers.

Voorbeelden van beschikbare inzichten:

* Gewonnen prijzen
* Opgehaalde prijzen
* Redeem Rate
* Gemiddelde tijd tot ophalen
* Analyse van prijssoorten
* Analyse van doelgroepen

Binnen het prototype wordt gewerkt met een selectie van ondernemers zodat eenvoudig tussen verschillende winkels kan worden gewisseld.

In een toekomstige implementatie wordt verwacht dat ondernemers uitsluitend toegang krijgen tot gegevens van hun eigen onderneming.

---

## Gebruikte data

Tijdens de ontwikkeling is gebruikgemaakt van dummydata.

De dataset bevat onder andere:

* Ondernemers
* Prijzen
* Leeftijdsgroepen
* Geslacht
* Campagnedeelname
* Gewonnen prijzen
* Opgehaalde prijzen
* Datums van uitgifte en ophalen

De dummydata is gebruikt om dashboardfunctionaliteiten te ontwikkelen voordat voldoende campagnegegevens beschikbaar waren.

---

## Installatie

### Vereisten

* Node.js 20+
* npm

### Installeren

```bash
npm install
```

### Applicatie starten

```bash
npm run dev
```

De applicatie wordt vervolgens lokaal beschikbaar via:

```text
http://localhost:5173
```

### Productie build

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

---

## Toekomstige uitbreidingen

Mogelijke uitbreidingen voor toekomstige versies:

* Integratie met live StoreTime-data
* Autorisaties per ondernemer
* Vergelijking tussen campagnes
* Vergelijking tussen periodes binnen campagnes
* AI-ondersteunde data-analyse
* Exportfunctionaliteiten
* Geavanceerde rapportages

---

## Auteur

Joey Zwinkels

Ontwikkeld voor de StoreTime-pilot in samenwerking met OBM en het StoreTime developmentteam.
