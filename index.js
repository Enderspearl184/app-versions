(async function() {
    const fs = require('fs');
    const parse = require('csv-parse').parse
    const finished = require('stream/promises').finished
    
    const processFile = async () => {
      const records = [];
      const parser = fs
        .createReadStream(`./app_versions.csv`)
        .pipe(parse());
        console.log('created stream')
      parser.on('readable', function(){
        let record; while ((record = parser.read()) !== null) {
        // Work with each record
          records.push(record);
        }
      });
      await finished(parser);
      console.log('finished loading')
      return records;
    };
    // Parse the CSV content
    let records = await processFile();
    records.shift()
    //structure to be like you get the idea
    //{"ca":{"1234":[{version_id:34873482348},{version_id:384832482}]}}}
    //csv structure is
    //"id","country","track_id","version_id","version_name","version_date","version_description","create_time","update_time"
    const regions = {}
    let regionMap = records.map(csv=>csv[1])
    for (let region of regionMap) {
        if (!regions[region]) {
            console.log('found region ' + region)
            regions[region]={}
        }
    }

    //WHY DOES ONE HAVE A NEWLINE IN IT
    delete regions["cn\nqq"]
    regions["cn_qq"] = {}

    for (let region in regions) {
        if (!fs.existsSync(`./app_data/${region}`)) {
            fs.mkdirSync(`./app_data/${region}`)
        }
    }
    //now for the fun!!!
    //create apps for each region
    regionMap = null //also clear up this garbage

    let appVerObjMap = records.map((csv)=>{return {"app_id":csv[0],"region":csv[1],"version_id":csv[3],"version_name":csv[4],'version_date':csv[5],'version_description':csv[6]}})

    //also clear this
    records = null
    let count = 1
    let length = appVerObjMap.length
    //loop that will take forever lol
    for (let appVer of appVerObjMap) {
        let region = appVer.region
        if (region.includes('\n')) {region="cn_qq"}
        let appId = appVer["app_id"]
        //remove the region from the data we dont need it, they are separated ANYWAYS
        //do the same to app id as well
        delete appVer.region
        delete appVer["app_id"]
        //if app id object doesnt exist make it exist
        regions[region][appId] = regions[region][appId] || []
        regions[region][appId].push(appVer)
        if (regions[region][appId].length==1) {console.log(`new app for region ${region} id ${appId} (${count}/${length})`)}
        count++
    }
    count = 0
    for (let region in regions) {
        for (let appId in regions[region]) {
            regions[region][appId] = regions[region][appId].sort((a,b)=>{
                if (a["version_id"]>b["version_id"]) {
                    return 1
                } else {
                    return -1
                }
            })
            count+=regions[region][appId].length
            console.log(`writing file for app id ${appId} ${count}/${length}`)
            fs.writeFileSync(`${appId}.json`,JSON.stringify(regions[region][appId]))
        }
    }
})()

