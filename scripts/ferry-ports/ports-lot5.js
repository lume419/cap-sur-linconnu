// Ports des liaisons du lot 5 (Adriatique, îles de Marmara, Alaska, États-Unis, Canada).
// Lieux tirés de public/data (voir scripts/ferry-ports/find-port.js) ; quand la localité du port manque dans les données,
// la localité la plus proche du terminal située sur la bonne rive est retenue.
// Liaison non renseignée : northAmerica|tatitlek (Valdez absent des données, aucune localité continentale à moins de 100 km).
module.exports = [
  { key: 'continental|rivanj', source: 'https://www.jadrolinija.hr/download/18688e6f7ef3d979e170eb769c6cb2cc (Zadar (Gaženica) ↔ Rivanj)',
    ports: {
    continental: [{ cc: 'HR', place: 'Zadar' }],
    rivanj: [{ cc: 'HR', place: 'Rivanj' }]
    } },
  { key: 'continental|sestrunj', source: 'https://www.jadrolinija.hr/download/18688e6f7ef3d979e170eb769c6cb2cc (Zadar (Gaženica) ↔ Sestrunj)',
    ports: {
    continental: [{ cc: 'HR', place: 'Zadar' }],
    sestrunj: [{ cc: 'HR', place: 'Sestrunj' }]
    } },
  { key: 'continental|zverinac', source: 'https://www.jadrolinija.hr/download/18688e6f7ef3d979e170eb769c6cb2cc (Zadar (Gaženica) ↔ Zverinac)',
    ports: {
    continental: [{ cc: 'HR', place: 'Zadar' }],
    zverinac: [{ cc: 'HR', place: 'Zverinac' }]
    } },
  { key: 'continental|molat', source: 'https://www.jadrolinija.hr/download/18688e6f7ef3d979e170eb769c6cb2cc (Zadar (Gaženica) ↔ Molat)',
    ports: {
    continental: [{ cc: 'HR', place: 'Zadar' }],
    molat: [{ cc: 'HR', place: 'Molat' }]
    } },
  { key: 'continental|rava', source: 'https://www.jadrolinija.hr/download/c603b755d68318915f5614d2beb53396 (Zadar (Gaženica) ↔ Rava)',
    ports: {
    continental: [{ cc: 'HR', place: 'Zadar' }],
    rava: [{ cc: 'HR', place: 'Rava' }]
    } },
  { key: 'continental|iz', source: 'https://www.jadrolinija.hr/download/c603b755d68318915f5614d2beb53396 (Zadar (Gaženica) ↔ Bršanj (Iž))',
    ports: {
    continental: [{ cc: 'HR', place: 'Zadar' }],
    iz: [{ cc: 'HR', place: 'Veli Iž' }]
    } },
  { key: 'continental|zirje', source: 'https://www.jadrolinija.hr/download/46ecba03b83ad48c526e907b483ed2bd (Šibenik ↔ Žirje)',
    ports: {
    continental: [{ cc: 'HR', place: 'Šibenik', near: [43.73, 15.89] }],
    zirje: [{ cc: 'HR', place: 'Žirje' }]
    } },
  { key: 'continental|sipan', source: 'https://www.jadrolinija.hr/download/7c405c1e2fe6cb106d506172ccd6fd6c (Dubrovnik (Gruž) ↔ Suđurađ (Šipan))',
    ports: {
    continental: [{ cc: 'HR', place: 'Dubrovnik' }],
    sipan: [{ cc: 'HR', place: 'Sudurad' }]
    } },
  { key: 'avsa|continental', source: 'https://gdu.com.tr/ucret-tarifeleri (Erdek ↔ Avşa)',
    ports: {
    avsa: [{ cc: 'TR', place: 'Avşa' }],
    continental: [{ cc: 'TR', place: 'Erdek', near: [40.40, 27.79] }]
    } },
  { key: 'continental|pasalimani', source: 'https://gdu.com.tr/ucret-tarifeleri (Erdek ↔ Balıklı (Paşalimanı))',
    ports: {
    continental: [{ cc: 'TR', place: 'Erdek', near: [40.40, 27.79] }],
    pasalimani: [{ cc: 'TR', place: 'Balıklı', near: [40.46, 27.63] }]
    } },
  { key: 'avsa|marmaraIsland', source: 'https://gdu.com.tr/ucret-tarifeleri (Avşa ↔ Marmara)',
    ports: {
    avsa: [{ cc: 'TR', place: 'Avşa' }],
    marmaraIsland: [{ cc: 'TR', place: 'Marmara' }]
    } },
  { key: 'avsa|ekinlik', source: 'https://gdu.com.tr/sefer-tarifeleri (Avşa ↔ Ekinlik)',
    ports: {
    avsa: [{ cc: 'TR', place: 'Avşa' }],
    ekinlik: [{ cc: 'TR', place: 'Ekenlik' }]
    } },
  { key: 'juneau|northAmerica', source: 'https://dot.alaska.gov/amhs/route.shtml (Haines ↔ Juneau (Auke Bay))',
    ports: {
    juneau: [{ cc: 'US', place: 'Auke Bay' }],
    northAmerica: [{ cc: 'US', place: 'Haines', near: [59.24, -135.45] }]
    } },
  { key: 'ketchikan|northAmerica', source: 'https://dot.alaska.gov/amhs/route.shtml (Bellingham ↔ Ketchikan)',
    ports: {
    ketchikan: [{ cc: 'US', place: 'Ketchikan' }],
    northAmerica: [{ cc: 'US', place: 'Bellingham', near: [48.76, -122.49] }]
    } },
  { key: 'ketchikan|metlakatla', source: 'https://dot.alaska.gov/amhs/route.shtml (Ketchikan ↔ Annette Bay (Metlakatla))',
    ports: {
    ketchikan: [{ cc: 'US', place: 'Ketchikan' }],
    metlakatla: [{ cc: 'US', place: 'Metlakatla' }]
    } },
  { key: 'ketchikan|princeOfWales', source: 'https://interislandferry.com/fares-pricing/ (Ketchikan ↔ Hollis)',
    ports: {
    ketchikan: [{ cc: 'US', place: 'Ketchikan' }],
    princeOfWales: [{ cc: 'US', place: 'Hollis', near: [55.56, -132.64] }]
    } },
  { key: 'ketchikan|wrangell', source: 'https://dot.alaska.gov/amhs/route.shtml (Ketchikan ↔ Wrangell)',
    ports: {
    ketchikan: [{ cc: 'US', place: 'Ketchikan' }],
    wrangell: [{ cc: 'US', place: 'Wrangell' }]
    } },
  { key: 'juneau|wrangell', source: 'https://dot.alaska.gov/amhs/route.shtml (Wrangell ↔ Juneau (via Petersburg))',
    ports: {
    juneau: [{ cc: 'US', place: 'Auke Bay' }],
    wrangell: [{ cc: 'US', place: 'Wrangell' }]
    } },
  { key: 'juneau|sitka', source: 'https://dot.alaska.gov/amhs/route.shtml (Juneau ↔ Sitka)',
    ports: {
    juneau: [{ cc: 'US', place: 'Auke Bay' }],
    sitka: [{ cc: 'US', place: 'Sitka', near: [57.05, -135.33] }]
    } },
  { key: 'hoonah|juneau', source: 'https://dot.alaska.gov/amhs/route.shtml (Juneau ↔ Hoonah)',
    ports: {
    hoonah: [{ cc: 'US', place: 'Hoonah' }],
    juneau: [{ cc: 'US', place: 'Auke Bay' }]
    } },
  { key: 'gustavus|juneau', source: 'https://dot.alaska.gov/amhs/route.shtml (Juneau ↔ Gustavus)',
    ports: {
    gustavus: [{ cc: 'US', place: 'Gustavus', near: [58.41, -135.74] }],
    juneau: [{ cc: 'US', place: 'Auke Bay' }]
    } },
  { key: 'angoon|juneau', source: 'https://dot.alaska.gov/amhs/route.shtml (Juneau ↔ Angoon)',
    ports: {
    angoon: [{ cc: 'US', place: 'Angoon' }],
    juneau: [{ cc: 'US', place: 'Auke Bay' }]
    } },
  { key: 'juneau|kake', source: 'https://dot.alaska.gov/amhs/route.shtml (Juneau ↔ Kake)',
    ports: {
    juneau: [{ cc: 'US', place: 'Auke Bay' }],
    kake: [{ cc: 'US', place: 'Kake' }]
    } },
  { key: 'juneau|tenakee', source: 'https://dot.alaska.gov/amhs/route.shtml (Juneau ↔ Tenakee Springs)',
    ports: {
    juneau: [{ cc: 'US', place: 'Auke Bay' }],
    tenakee: [{ cc: 'US', place: 'Tenakee Springs' }]
    } },
  { key: 'juneau|pelican', source: 'https://dot.alaska.gov/amhs/route.shtml (Juneau ↔ Pelican)',
    ports: {
    juneau: [{ cc: 'US', place: 'Auke Bay' }],
    pelican: [{ cc: 'US', place: 'Pelican', near: [57.96, -136.23] }]
    } },
  { key: 'cordova|northAmerica', source: 'https://dot.alaska.gov/amhs/route.shtml (Whittier ↔ Cordova)',
    ports: {
    cordova: [{ cc: 'US', place: 'Cordova', near: [60.54, -145.76] }],
    northAmerica: [{ cc: 'US', place: 'Whittier', near: [60.77, -148.69] }]
    } },
  { key: 'northAmerica|seldovia', source: 'https://dot.alaska.gov/amhs/route.shtml (Homer ↔ Seldovia)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Nikolaevsk' }],
    seldovia: [{ cc: 'US', place: 'Seldovia' }]
    } },
  { key: 'kodiak|northAmerica', source: 'https://dot.alaska.gov/amhs/route.shtml (Homer ↔ Kodiak)',
    ports: {
    kodiak: [{ cc: 'US', place: 'Kodiak', near: [57.79, -152.41] }],
    northAmerica: [{ cc: 'US', place: 'Nikolaevsk' }]
    } },
  { key: 'kodiak|portLions', source: 'https://dot.alaska.gov/amhs/route.shtml (Kodiak ↔ Port Lions)',
    ports: {
    kodiak: [{ cc: 'US', place: 'Kodiak', near: [57.79, -152.41] }],
    portLions: [{ cc: 'US', place: 'Port Lions' }]
    } },
  { key: 'kodiak|ouzinkie', source: 'https://dot.alaska.gov/amhs/route.shtml (Kodiak ↔ Ouzinkie)',
    ports: {
    kodiak: [{ cc: 'US', place: 'Kodiak', near: [57.79, -152.41] }],
    ouzinkie: [{ cc: 'US', place: 'Ouzinkie' }]
    } },
  { key: 'kodiak|oldHarbor', source: 'https://dot.alaska.gov/amhs/route.shtml (Kodiak ↔ Old Harbor)',
    ports: {
    kodiak: [{ cc: 'US', place: 'Kodiak', near: [57.79, -152.41] }],
    oldHarbor: [{ cc: 'US', place: 'Old Harbor', near: [57.20, -153.31] }]
    } },
  { key: 'chignik|kodiak', source: 'https://dot.alaska.gov/amhs/route.shtml (Kodiak ↔ Chignik)',
    ports: {
    chignik: [{ cc: 'US', place: 'Chignik' }],
    kodiak: [{ cc: 'US', place: 'Kodiak', near: [57.79, -152.41] }]
    } },
  { key: 'chignik|sandPoint', source: 'https://dot.alaska.gov/amhs/route.shtml (Chignik ↔ Sand Point)',
    ports: {
    chignik: [{ cc: 'US', place: 'Chignik' }],
    sandPoint: [{ cc: 'US', place: 'Sand Point', near: [55.34, -160.50] }]
    } },
  { key: 'kingCove|sandPoint', source: 'https://dot.alaska.gov/amhs/route.shtml (Sand Point ↔ King Cove)',
    ports: {
    kingCove: [{ cc: 'US', place: 'King Cove' }],
    sandPoint: [{ cc: 'US', place: 'Sand Point', near: [55.34, -160.50] }]
    } },
  { key: 'coldBay|kingCove', source: 'https://dot.alaska.gov/amhs/route.shtml (King Cove ↔ Cold Bay)',
    ports: {
    coldBay: [{ cc: 'US', place: 'Cold Bay' }],
    kingCove: [{ cc: 'US', place: 'King Cove' }]
    } },
  { key: 'coldBay|falsePass', source: 'https://dot.alaska.gov/amhs/route.shtml (Cold Bay ↔ False Pass)',
    ports: {
    coldBay: [{ cc: 'US', place: 'Cold Bay' }],
    falsePass: [{ cc: 'US', place: 'False Pass' }]
    } },
  { key: 'akutan|falsePass', source: 'https://dot.alaska.gov/amhs/route.shtml (False Pass ↔ Akutan)',
    ports: {
    akutan: [{ cc: 'US', place: 'Akutan' }],
    falsePass: [{ cc: 'US', place: 'False Pass' }]
    } },
  { key: 'akutan|unalaska', source: 'https://dot.alaska.gov/amhs/route.shtml (Akutan ↔ Dutch Harbor)',
    ports: {
    akutan: [{ cc: 'US', place: 'Akutan' }],
    unalaska: [{ cc: 'US', place: 'Dutch Harbor' }]
    } },
  { key: 'northAmerica|sanJuanIsland', source: 'https://wsdot.wa.gov/ferries/fares/FaresDetail.aspx?departingterm=1&arrivingterm=10 (Anacortes ↔ Friday Harbor)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Anacortes' }],
    sanJuanIsland: [{ cc: 'US', place: 'Friday Harbor' }]
    } },
  { key: 'northAmerica|orcasIsland', source: 'https://wsdot.wa.gov/ferries/fares/FaresDetail.aspx?departingterm=1&arrivingterm=15 (Anacortes ↔ Orcas Island)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Anacortes' }],
    orcasIsland: [{ cc: 'US', place: 'Orcas' }]
    } },
  { key: 'northAmerica|shawIsland', source: 'https://wsdot.wa.gov/ferries/fares/FaresDetail.aspx?departingterm=1&arrivingterm=18 (Anacortes ↔ Shaw Island)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Anacortes' }],
    shawIsland: [{ cc: 'US', place: 'Shaw Island', near: [48.584, -122.929] }]
    } },
  { key: 'lopezIsland|northAmerica', source: 'https://wsdot.wa.gov/ferries/fares/FaresDetail.aspx?departingterm=1&arrivingterm=13 (Anacortes ↔ Lopez Island)',
    ports: {
    lopezIsland: [{ cc: 'US', place: 'Port Stanley' }],
    northAmerica: [{ cc: 'US', place: 'Anacortes' }]
    } },
  { key: 'northAmerica|vashonIsland', source: 'https://wsdot.wa.gov/ferries/fares/FaresDetail.aspx?departingterm=9&arrivingterm=22 (Fauntleroy ↔ Vashon Island)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Arroyo Heights' }],
    vashonIsland: [{ cc: 'US', place: 'Vashon Heights' }]
    } },
  { key: 'guemesIsland|northAmerica', source: 'https://www.skagitcounty.net/PublicWorksFerry/Documents/2026fares/Guemes%20Ferry%20Brochure%20Jan%202026.pdf (Anacortes ↔ Guemes Island)',
    ports: {
    guemesIsland: [{ cc: 'US', place: 'Guemes' }],
    northAmerica: [{ cc: 'US', place: 'Anacortes' }]
    } },
  { key: 'lummiIsland|northAmerica', source: 'https://www.whatcomcounty.us/382/Lummi-Island-Ferry (Gooseberry Point ↔ Lummi Island)',
    ports: {
    lummiIsland: [{ cc: 'US', place: 'Lummi Island' }],
    northAmerica: [{ cc: 'US', place: 'Lummi' }]
    } },
  { key: 'andersonIsland|northAmerica', source: 'https://pierce-county.getanchor.io/fares/ (Steilacoom ↔ Anderson Island)',
    ports: {
    andersonIsland: [{ cc: 'US', place: 'Johnson Landing', near: [47.18, -122.69] }],
    northAmerica: [{ cc: 'US', place: 'Steilacoom' }]
    } },
  { key: 'ketronIsland|northAmerica', source: 'https://pierce-county.getanchor.io/fares/ (Steilacoom ↔ Ketron Island)',
    ports: {
    ketronIsland: [{ cc: 'US', place: 'Ketron', near: [47.15, -122.62] }],
    northAmerica: [{ cc: 'US', place: 'Steilacoom' }]
    } },
  { key: 'beaverIsland|northAmerica', source: 'https://www.bibco.com/rates (Charlevoix ↔ Saint James (Beaver Island))',
    ports: {
    beaverIsland: [{ cc: 'US', place: 'Saint James', near: [45.75, -85.52] }],
    northAmerica: [{ cc: 'US', place: 'Charlevoix' }]
    } },
  { key: 'boisBlancIsland|northAmerica', source: 'https://www.plaunttransportation.com/rates-1 (Cheboygan ↔ Bois Blanc Island)',
    ports: {
    boisBlancIsland: [{ cc: 'US', place: 'Pointe Aux Pins' }],
    northAmerica: [{ cc: 'US', place: 'Cheboygan' }]
    } },
  { key: 'drummondIsland|northAmerica', source: 'https://www.eupta.net/wp-content/media/Drummond-Ferry-Schedule-and-Rates.pdf (De Tour Village ↔ Drummond Island)',
    ports: {
    drummondIsland: [{ cc: 'US', place: 'Drummond', near: [46.02, -83.73] }],
    northAmerica: [{ cc: 'US', place: 'De Tour Village' }]
    } },
  { key: 'northAmerica|sugarIsland', source: 'https://www.eupta.net/wp-content/media/Sugar-Ferry-Schedule-and-Rates.pdf (Sault Ste. Marie ↔ Sugar Island)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Sault Ste. Marie' }],
    sugarIsland: [{ cc: 'US', place: 'Baie de Wasai' }]
    } },
  { key: 'harsensIsland|northAmerica', source: 'https://hiferry.com/rates/ (Algonac ↔ Harsens Island)',
    ports: {
    harsensIsland: [{ cc: 'US', place: 'Harsens Island' }],
    northAmerica: [{ cc: 'US', place: 'Algonac' }]
    } },
  { key: 'northAmerica|washingtonIsland', source: 'https://wisferry.com/washington-island/ (Northport ↔ Washington Island (Detroit Harbor))',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Northport', near: [45.29, -86.98] }],
    washingtonIsland: [{ cc: 'US', place: 'Detroit Harbor' }]
    } },
  { key: 'madelineIsland|northAmerica', source: 'https://madferry.com/ferry-rates (Bayfield ↔ La Pointe (Madeline Island))',
    ports: {
    madelineIsland: [{ cc: 'US', place: 'La Pointe' }],
    northAmerica: [{ cc: 'US', place: 'Bayfield', near: [46.81, -90.82] }]
    } },
  { key: 'northAmerica|southBassIsland', source: 'https://www.millerferry.com/put-in-bay-fares (Catawba ↔ Put-in-Bay (South Bass Island))',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Catawba Island' }],
    southBassIsland: [{ cc: 'US', place: 'Put-in-Bay' }]
    } },
  { key: 'middleBassIsland|northAmerica', source: 'https://www.millerferry.com/ (Catawba ↔ Middle Bass Island)',
    ports: {
    middleBassIsland: [{ cc: 'US', place: 'Middle Bass' }],
    northAmerica: [{ cc: 'US', place: 'Catawba Island' }]
    } },
  { key: 'kelleysIsland|northAmerica', source: 'https://kelleysislandferry.com/fares/ (Marblehead ↔ Kelleys Island)',
    ports: {
    kelleysIsland: [{ cc: 'US', place: 'Kelleys Island' }],
    northAmerica: [{ cc: 'US', place: 'Marblehead', near: [41.54, -82.74] }]
    } },
  { key: 'marthasVineyard|northAmerica', source: 'https://www.steamshipauthority.com/visitors/fares (Woods Hole ↔ Vineyard Haven)',
    ports: {
    marthasVineyard: [{ cc: 'US', place: 'Vineyard Haven' }],
    northAmerica: [{ cc: 'US', place: 'Quissett' }]
    } },
  { key: 'nantucket|northAmerica', source: 'https://www.steamshipauthority.com/visitors/fares (Hyannis ↔ Nantucket)',
    ports: {
    nantucket: [{ cc: 'US', place: 'Nantucket', near: [41.28, -70.10] }],
    northAmerica: [{ cc: 'US', place: 'Hyannis', near: [41.65, -70.28] }]
    } },
  { key: 'chappaquiddick|marthasVineyard', source: 'https://www.chappyferry.com/rates (Edgartown ↔ Chappaquiddick)',
    ports: {
    chappaquiddick: [{ cc: 'US', place: 'Chappaquiddick' }],
    marthasVineyard: [{ cc: 'US', place: 'Edgartown' }]
    } },
  { key: 'blockIsland|northAmerica', source: 'https://www.blockislandferry.com/wp-content/uploads/2026/04/2026schedule-FINAL.pdf (Point Judith ↔ Block Island (Old Harbor))',
    ports: {
    blockIsland: [{ cc: 'US', place: 'New Shoreham' }],
    northAmerica: [{ cc: 'US', place: 'Galilee', near: [41.38, -71.51] }]
    } },
  { key: 'fishersIsland|northAmerica', source: 'https://www.fiferry.com/auto-ferry-rates/ (New London ↔ Fishers Island)',
    ports: {
    fishersIsland: [{ cc: 'US', place: 'Fishers Island' }],
    northAmerica: [{ cc: 'US', place: 'New London', near: [41.36, -72.10] }]
    } },
  { key: 'northAmerica|shelterIsland', source: 'https://northferry.com/rates (Greenport ↔ Shelter Island)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Greenport' }],
    shelterIsland: [{ cc: 'US', place: 'Shelter Island Heights' }]
    } },
  { key: 'northAmerica|prudenceIsland', source: 'https://prudencebayislandstransport.com/rates/ (Bristol ↔ Prudence Island)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Bristol', near: [41.68, -71.27] }],
    prudenceIsland: [{ cc: 'US', place: 'Prudence Island' }]
    } },
  { key: 'northAmerica|peaksIsland', source: 'https://www.cascobaylines.com/portland-ferry-rates/peaks-island-car-ferry/ (Portland ↔ Peaks Island)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Portland', near: [43.66, -70.26] }],
    peaksIsland: [{ cc: 'US', place: 'Peaks Island' }]
    } },
  { key: 'longIslandME|northAmerica', source: 'https://www.cascobaylines.com/portland-ferry-rates/island-car-ferry/ (Portland ↔ Long Island (Casco Bay))',
    ports: {
    longIslandME: [{ cc: 'US', place: 'Long Island', near: [43.68, -70.17] }],
    northAmerica: [{ cc: 'US', place: 'Portland', near: [43.66, -70.26] }]
    } },
  { key: 'chebeagueIsland|northAmerica', source: 'https://www.cascobaylines.com/portland-ferry-rates/island-car-ferry/ (Portland ↔ Chebeague Island)',
    ports: {
    chebeagueIsland: [{ cc: 'US', place: 'Chebeague Island' }],
    northAmerica: [{ cc: 'US', place: 'Portland', near: [43.66, -70.26] }]
    } },
  { key: 'cliffIsland|northAmerica', source: 'https://www.cascobaylines.com/portland-ferry-rates/island-car-ferry/ (Portland ↔ Cliff Island)',
    ports: {
    cliffIsland: [{ cc: 'US', place: 'Cliff Island' }],
    northAmerica: [{ cc: 'US', place: 'Portland', near: [43.66, -70.26] }]
    } },
  { key: 'greatDiamondIsland|northAmerica', source: 'https://www.cascobaylines.com/portland-ferry-rates/island-car-ferry/ (Portland ↔ Great Diamond Island)',
    ports: {
    greatDiamondIsland: [{ cc: 'US', place: 'Great Diamond Island Landing' }],
    northAmerica: [{ cc: 'US', place: 'Portland', near: [43.66, -70.26] }]
    } },
  { key: 'northAmerica|vinalhaven', source: 'https://www.maine.gov/dot/programs-services/ferry/fares-schedules (Rockland ↔ Vinalhaven)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Rockland', near: [44.10, -69.11] }],
    vinalhaven: [{ cc: 'US', place: 'Vinalhaven' }]
    } },
  { key: 'northAmerica|northHaven', source: 'https://www.maine.gov/dot/programs-services/ferry/fares-schedules (Rockland ↔ North Haven)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Rockland', near: [44.10, -69.11] }],
    northHaven: [{ cc: 'US', place: 'North Haven', near: [44.13, -68.87] }]
    } },
  { key: 'islesboro|northAmerica', source: 'https://www.maine.gov/dot/programs-services/ferry/fares-schedules (Lincolnville ↔ Islesboro)',
    ports: {
    islesboro: [{ cc: 'US', place: 'Islesboro' }],
    northAmerica: [{ cc: 'US', place: 'Lincolnville', near: [44.28, -69.01] }]
    } },
  { key: 'northAmerica|swansIsland', source: 'https://www.maine.gov/dot/programs-services/ferry/fares-schedules (Bass Harbor ↔ Swan\'s Island)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Bass Harbor' }],
    swansIsland: [{ cc: 'US', place: 'Swans Island' }]
    } },
  { key: 'frenchboro|northAmerica', source: 'https://www.maine.gov/dot/programs-services/ferry/fares-schedules (Bass Harbor ↔ Frenchboro)',
    ports: {
    frenchboro: [{ cc: 'US', place: 'Frenchboro' }],
    northAmerica: [{ cc: 'US', place: 'Bass Harbor' }]
    } },
  { key: 'matinicus|northAmerica', source: 'https://www.maine.gov/dot/programs-services/ferry/fares-schedules (Rockland ↔ Matinicus)',
    ports: {
    matinicus: [{ cc: 'US', place: 'Matinicus' }],
    northAmerica: [{ cc: 'US', place: 'Rockland', near: [44.10, -69.11] }]
    } },
  { key: 'northAmerica|ocracoke', source: 'https://www.ncdot.gov/travel-maps/ferry-tickets-services/Pages/ticket-prices.aspx (Hatteras ↔ Ocracoke)',
    ports: {
    northAmerica: [{ cc: 'US', place: 'Hatteras' }],
    ocracoke: [{ cc: 'US', place: 'Widgen Woods' }]
    } },
  { key: 'newfoundland|northAmerica', source: 'https://www.marineatlantic.ca/sailing-information/ferry-rates/port-aux-basques-nl-north-sydney-ns (North Sydney ↔ Channel-Port aux Basques)',
    ports: {
    newfoundland: [{ cc: 'CA', place: 'Channel-Port aux Basques' }],
    northAmerica: [{ cc: 'CA', place: 'North Sydney' }]
    } },
  { key: 'newfoundland|saintPierre', source: 'https://www.spm-ferries.fr/wp-content/uploads/2026/08/TARIFS-vehicules-au-26-MAI-2026-FR.pdf (Fortune ↔ Saint-Pierre)',
    ports: {
    newfoundland: [{ cc: 'CA', place: 'Fortune' }],
    saintPierre: [{ cc: 'FR', place: 'Saint-Pierre', near: [46.79, -56.18] }]
    } },
  { key: 'bellIsland|newfoundland', source: 'https://www.gov.nl.ca/ti/files/ferryservices-schedules-pdf-old-bell-island-rates.pdf (Portugal Cove ↔ Bell Island)',
    ports: {
    bellIsland: [{ cc: 'CA', place: 'Bell Island Front' }],
    newfoundland: [{ cc: 'CA', place: 'Portugal Cove' }]
    } },
  { key: 'fogoIsland|newfoundland', source: 'https://www.gov.nl.ca/ti/files/ferryservices-schedules-pdf-old-fogo-ci-farewell-rates.pdf (Farewell ↔ Fogo Island)',
    ports: {
    fogoIsland: [{ cc: 'CA', place: 'Seldom-Little Seldom' }],
    newfoundland: [{ cc: 'CA', place: 'Tims Harbour' }]
    } },
  { key: 'changeIslands|newfoundland', source: 'https://www.gov.nl.ca/ti/files/ferryservices-schedules-pdf-old-fogo-ci-farewell-rates.pdf (Farewell ↔ Change Islands)',
    ports: {
    changeIslands: [{ cc: 'CA', place: 'Change Islands' }],
    newfoundland: [{ cc: 'CA', place: 'Tims Harbour' }]
    } },
  { key: 'longIslandNL|newfoundland', source: 'https://www.gov.nl.ca/ti/files/ferryservices-schedules-pdf-longisld-pilleysisld-rates.pdf (Pilley\'s Island ↔ Long Island (Lushes Bight))',
    ports: {
    longIslandNL: [{ cc: 'CA', place: 'Lushes Bight-Beaumont-Beaumont North' }],
    newfoundland: [{ cc: 'CA', place: 'Pilley\'s Island' }]
    } },
  { key: 'newfoundland|stBrendans', source: 'https://www.gov.nl.ca/ti/files/ferryservices-schedules-pdf-old-stbrendans-burnside-rates.pdf (Burnside ↔ St. Brendan\'s)',
    ports: {
    newfoundland: [{ cc: 'CA', place: 'Burnside', near: [48.72, -53.80] }],
    stBrendans: [{ cc: 'CA', place: 'St. Brendan\'s' }]
    } },
  { key: 'newfoundland|ramea', source: 'https://www.gov.nl.ca/ti/files/Marine-Services-Ramea-Grey-River-Burgeo-Rates.pdf (Burgeo ↔ Ramea)',
    ports: {
    newfoundland: [{ cc: 'CA', place: 'Burgeo' }],
    ramea: [{ cc: 'CA', place: 'Ramea' }]
    } },
  { key: 'northAmerica|rigolet', source: 'https://www.gov.nl.ca/ti/files/Marine-Services-Goose-Bay-Rigolet-Ports-North-to-Nain-Ferry-Rates-June-2020.pdf (Happy Valley-Goose Bay ↔ Rigolet)',
    ports: {
    northAmerica: [{ cc: 'CA', place: 'Happy Valley-Goose Bay' }],
    rigolet: [{ cc: 'CA', place: 'Rigolet' }]
    } },
  { key: 'makkovik|rigolet', source: 'https://www.gov.nl.ca/ti/files/Marine-Services-Goose-Bay-Rigolet-Ports-North-to-Nain-Ferry-Rates-June-2020.pdf (Rigolet ↔ Makkovik)',
    ports: {
    makkovik: [{ cc: 'CA', place: 'Makkovik' }],
    rigolet: [{ cc: 'CA', place: 'Rigolet' }]
    } },
  { key: 'makkovik|postville', source: 'https://www.gov.nl.ca/ti/files/Marine-Services-Goose-Bay-Rigolet-Ports-North-to-Nain-Ferry-Rates-June-2020.pdf (Makkovik ↔ Postville)',
    ports: {
    makkovik: [{ cc: 'CA', place: 'Makkovik' }],
    postville: [{ cc: 'CA', place: 'Postville' }]
    } },
  { key: 'hopedale|makkovik', source: 'https://www.gov.nl.ca/ti/files/Marine-Services-Goose-Bay-Rigolet-Ports-North-to-Nain-Ferry-Rates-June-2020.pdf (Makkovik ↔ Hopedale)',
    ports: {
    hopedale: [{ cc: 'CA', place: 'Hopedale' }],
    makkovik: [{ cc: 'CA', place: 'Makkovik' }]
    } },
  { key: 'hopedale|natuashish', source: 'https://www.gov.nl.ca/ti/files/Marine-Services-Goose-Bay-Rigolet-Ports-North-to-Nain-Ferry-Rates-June-2020.pdf (Hopedale ↔ Natuashish)',
    ports: {
    hopedale: [{ cc: 'CA', place: 'Hopedale' }],
    natuashish: [{ cc: 'CA', place: 'Natuashish' }]
    } },
  { key: 'nain|natuashish', source: 'https://www.gov.nl.ca/ti/files/Marine-Services-Goose-Bay-Rigolet-Ports-North-to-Nain-Ferry-Rates-June-2020.pdf (Natuashish ↔ Nain)',
    ports: {
    nain: [{ cc: 'CA', place: 'Nain' }],
    natuashish: [{ cc: 'CA', place: 'Natuashish' }]
    } },
  { key: 'grandManan|northAmerica', source: 'https://grandmanan.coastaltransport.ca/rates.html (Blacks Harbour ↔ North Head (Grand Manan))',
    ports: {
    grandManan: [{ cc: 'CA', place: 'North Head' }],
    northAmerica: [{ cc: 'CA', place: 'Blacks Harbour' }]
    } },
  { key: 'grandManan|whiteHeadIsland', source: 'http://whitehead.coastaltransport.ca/lang.php?code=en (Ingalls Head ↔ White Head Island)',
    ports: {
    grandManan: [{ cc: 'CA', place: 'Ingalls Head' }],
    whiteHeadIsland: [{ cc: 'CA', place: 'White Head' }]
    } },
  { key: 'deerIsland|northAmerica', source: 'http://deerisland.coastaltransport.ca/lang.php?code=en (Letete ↔ Deer Island)',
    ports: {
    deerIsland: [{ cc: 'CA', place: 'Lamberts Cove' }],
    northAmerica: [{ cc: 'CA', place: 'Letete' }]
    } },
  { key: 'longIslandNS|northAmerica', source: 'https://novascotia.ca/tran/hottopics/ferries.asp (East Ferry ↔ Tiverton)',
    ports: {
    longIslandNS: [{ cc: 'CA', place: 'Tiverton', near: [44.39, -66.21] }],
    northAmerica: [{ cc: 'CA', place: 'East Ferry' }]
    } },
  { key: 'brierIsland|longIslandNS', source: 'https://novascotia.ca/tran/hottopics/ferries.asp (Freeport ↔ Westport)',
    ports: {
    brierIsland: [{ cc: 'CA', place: 'Westport', near: [44.27, -66.35] }],
    longIslandNS: [{ cc: 'CA', place: 'Freeport' }]
    } },
  { key: 'ilesDeLaMadeleine|northAmerica', source: 'https://www.traversierctma.ca/en/rates (Souris ↔ Cap-aux-Meules)',
    ports: {
    ilesDeLaMadeleine: [{ cc: 'CA', place: 'Cap-aux-Meules' }],
    northAmerica: [{ cc: 'CA', place: 'Souris', near: [46.35, -62.25] }]
    } },
  { key: 'ileAuxGrues|northAmerica', source: 'https://www.traversiers.com/en/our-ferries/lisle-aux-grues-montmagny-ferry/fares (Montmagny ↔ L\'Isle-aux-Grues)',
    ports: {
    ileAuxGrues: [{ cc: 'CA', place: 'Île-Aux-Grues' }],
    northAmerica: [{ cc: 'CA', place: 'Montmagny' }]
    } },
  { key: 'anticosti|northAmerica', source: 'https://relaisnordik.com/horaires-et-tarifs-traverser/ (Havre-Saint-Pierre ↔ Port-Menier)',
    ports: {
    anticosti: [{ cc: 'CA', place: 'Port-Menier' }],
    northAmerica: [{ cc: 'CA', place: 'Havre-Saint-Pierre' }]
    } },
  { key: 'laRomaine|northAmerica', source: 'https://relaisnordik.com/horaires-et-tarifs-traverser/ (Kegaska ↔ La Romaine)',
    ports: {
    laRomaine: [{ cc: 'CA', place: 'La Romaine' }],
    northAmerica: [{ cc: 'CA', place: 'Kegaska' }]
    } },
  { key: 'laTabatiere|teteALaBaleine', source: 'https://relaisnordik.com/horaires-et-tarifs-traverser/ (Tête-à-la-Baleine ↔ La Tabatière)',
    ports: {
    laTabatiere: [{ cc: 'CA', place: 'La Tabatière' }],
    teteALaBaleine: [{ cc: 'CA', place: 'Tête-à-la-Baleine' }]
    } },
  { key: 'laTabatiere|northAmerica', source: 'https://relaisnordik.com/horaires-et-tarifs-traverser/ (La Tabatière ↔ Blanc-Sablon)',
    ports: {
    laTabatiere: [{ cc: 'CA', place: 'La Tabatière' }],
    northAmerica: [{ cc: 'CA', place: 'Blanc-Sablon' }]
    } },
  { key: 'northAmerica|saintAugustin', source: 'https://relaisnordik.com/horaires-et-tarifs-traverser/ (Saint-Augustin ↔ Blanc-Sablon)',
    ports: {
    northAmerica: [{ cc: 'CA', place: 'Blanc-Sablon' }],
    saintAugustin: [{ cc: 'CA', place: 'Saint-Augustin', near: [51.23, -58.65] }]
    } },
  { key: 'northAmerica|wolfeIsland', source: 'https://www.frontenaccounty.ca/visit/wolfe-island/plan-your-trip/ (Kingston ↔ Marysville (Wolfe Island))',
    ports: {
    northAmerica: [{ cc: 'CA', place: 'Kingston', near: [44.23, -76.48] }],
    wolfeIsland: [{ cc: 'CA', place: 'Marysville', near: [44.19, -76.44] }]
    } },
  { key: 'simcoeIsland|wolfeIsland', source: 'https://www.frontenacislands.ca/en/living-here/ferries.aspx (Wolfe Island ↔ Simcoe Island)',
    ports: {
    simcoeIsland: [{ cc: 'CA', place: 'Simcoe Island' }],
    wolfeIsland: [{ cc: 'CA', place: 'Marysville', near: [44.19, -76.44] }]
    } },
  { key: 'amherstIsland|northAmerica', source: 'https://www.loyalist.ca/en/living-in-loyalist/amherst-island-ferry.aspx (Millhaven ↔ Stella (Amherst Island))',
    ports: {
    amherstIsland: [{ cc: 'CA', place: 'Stella' }],
    northAmerica: [{ cc: 'CA', place: 'Millhaven' }]
    } },
  { key: 'northAmerica|peleeIsland', source: 'https://www.ontarioferries.com/pelee-island-ferries/fares/ (Leamington/Kingsville ↔ Pelee Island)',
    ports: {
    northAmerica: [{ cc: 'CA', place: 'Leamington', near: [42.05, -82.60] }, { cc: 'CA', place: 'Kingsville', near: [42.04, -82.74] }],
    peleeIsland: [{ cc: 'CA', place: 'Pelee' }]
    } },
  { key: 'northAmerica|vancouverIsland', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Tsawwassen ↔ Swartz Bay)',
    ports: {
    northAmerica: [{ cc: 'CA', place: 'Beach Grove' }],
    vancouverIsland: [{ cc: 'CA', place: 'Swartz Bay' }]
    } },
  { key: 'lowerSunshineCoast|northAmerica', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Horseshoe Bay ↔ Langdale)',
    ports: {
    lowerSunshineCoast: [{ cc: 'CA', place: 'Langdale' }],
    northAmerica: [{ cc: 'CA', place: 'Sunset Beach', near: [49.40, -123.25] }]
    } },
  { key: 'bowenIsland|northAmerica', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Horseshoe Bay ↔ Snug Cove (Bowen Island))',
    ports: {
    bowenIsland: [{ cc: 'CA', place: 'Bowen Island' }],
    northAmerica: [{ cc: 'CA', place: 'Sunset Beach', near: [49.40, -123.25] }]
    } },
  { key: 'lowerSunshineCoast|upperSunshineCoast', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Earls Cove ↔ Saltery Bay)',
    ports: {
    lowerSunshineCoast: [{ cc: 'CA', place: 'Earls Cove' }],
    upperSunshineCoast: [{ cc: 'CA', place: 'Saltery Bay' }]
    } },
  { key: 'upperSunshineCoast|vancouverIsland', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Comox (Little River) ↔ Powell River (Westview))',
    ports: {
    upperSunshineCoast: [{ cc: 'CA', place: 'Westview', near: [49.84, -124.53] }],
    vancouverIsland: [{ cc: 'CA', place: 'Little River', near: [49.74, -124.92] }]
    } },
  { key: 'texadaIsland|upperSunshineCoast', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Powell River ↔ Blubber Bay (Texada))',
    ports: {
    texadaIsland: [{ cc: 'CA', place: 'Blubber Bay' }],
    upperSunshineCoast: [{ cc: 'CA', place: 'Westview', near: [49.84, -124.53] }]
    } },
  { key: 'saltSpringIsland|vancouverIsland', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Crofton ↔ Vesuvius Bay (Salt Spring))',
    ports: {
    saltSpringIsland: [{ cc: 'CA', place: 'Vesuvius' }],
    vancouverIsland: [{ cc: 'CA', place: 'Crofton', near: [48.87, -123.65] }]
    } },
  { key: 'northAmerica|saltSpringIsland', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Tsawwassen ↔ Long Harbour (Salt Spring))',
    ports: {
    northAmerica: [{ cc: 'CA', place: 'Beach Grove' }],
    saltSpringIsland: [{ cc: 'CA', place: 'Ganges' }]
    } },
  { key: 'northAmerica|penderIsland', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Tsawwassen ↔ Otter Bay (Pender Island))',
    ports: {
    northAmerica: [{ cc: 'CA', place: 'Beach Grove' }],
    penderIsland: [{ cc: 'CA', place: 'Port Washington' }]
    } },
  { key: 'mayneIsland|northAmerica', source: 'https://www.bcferries.com/web_image/h90/h4b/9089486028830.pdf (Tsawwassen ↔ Village Bay (Mayne Island))',
    ports: {
    mayneIsland: [{ cc: 'CA', place: 'Mayne' }],
    northAmerica: [{ cc: 'CA', place: 'Beach Grove' }]
    } }
];
