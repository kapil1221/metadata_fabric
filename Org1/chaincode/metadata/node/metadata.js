'use strict';
const shim = require('fabric-shim');
const util = require('util');

let Chaincode = class {

  async Init(stub) {
    console.info('=========== Instantiated College chaincode ===========');
    return shim.success();
  }

  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];
    if (!method) {
      console.error('no function of name:' + ret.fcn + ' found');
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }
    try {
      let payload = await method(stub, ret.params, this);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }
  

  /**
   *
   * @param {*} stub
   * @param {*} args
   */
 // This function is used to query Child by that particular CHILD id.
  async queryRecord(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting CarNumber ex: INCIDENT01');
    }
    let childNumber = args[0];
    let childAsBytes = await stub.getState(childNumber); 
      if (!childAsBytes || childAsBytes.toString().length <= 0) {
      throw new Error(childNumber + ' does not exist: ');
    }
    console.log(childAsBytes.toString());
    return childAsBytes;
  }
 
  //rich query model function 
  
  async richQuery(stub, args, thisClass){
        if (args.length < 2) {
            throw new Error('Incorrect number of arguments. Expecting two arguments');
        }

        let queryValue = args[1]; // query value you are looking for. ex: student name
	      let queryElement = args[0]; // object property where you wanted to search for value. ex: searching for student name in particular branch. here branch is a property of object in which we are looking for particular student name 
        let queryString = {};
        queryString.selector = {};
        queryString.selector[queryElement] = queryValue;
       //queryString.selector[queryElement2] = queryValue2;  (You can add more complex queries like this)
        let method = thisClass['getQueryResultForQueryString'];
        let queryResults = await method(stub, JSON.stringify(queryString), thisClass);
        return queryResults; //shim.success(queryResults);
    }
async getQueryResultForQueryString(stub, queryString, thisClass) {

        console.info('- getQueryResultForQueryString queryString:\n' + queryString)
        let resultsIterator = await stub.getQueryResult(queryString);
        let method = thisClass['getAllResults'];
    
        let results = await method(resultsIterator, false);
    
        return Buffer.from(JSON.stringify(results));
}
	
async getAllResults(iterator, isHistory) {
        let allResults = [];
        while (true) {
          let res = await iterator.next();
    
          if (res.value && res.value.value.toString()) {
            let jsonRes = {};
            console.log(res.value.value.toString('utf8'));
    
            if (isHistory && isHistory === true) {
              jsonRes.TxId = res.value.tx_id;
              jsonRes.Timestamp = res.value.timestamp;
              jsonRes.IsDelete = res.value.is_delete.toString();
              try {
                jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
              } catch (err) {
                console.log(err);
                jsonRes.Value = res.value.value.toString('utf8');
              }
            } else {
              jsonRes.Key = res.value.key;
              try {
                jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
              } catch (err) {
                console.log(err);
                jsonRes.Record = res.value.value.toString('utf8');
              }
            }
            allResults.push(jsonRes);
          }
          if (res.done) {
            console.log('end of data');
            await iterator.close();
            console.info(allResults);
            return allResults;
          }
        }
    }
  

  /**
   *
   * @param {*} stub
   * @param {*} args
   */
  // To create a new Record 
  async createRecord(stub, args) {
    console.info('============= START : Create Record ===========');
    if (args.length != 4) {
      throw new Error('Incorrect number of arguments. Expecting 4');
    }

    var Details = {
      docType: 'record',
      transactionHash: args[1],
      metaData: args[2],
      DateAndTime: args[3]
    };

    await stub.putState(args[0], Buffer.from(JSON.stringify(Details)));
    console.info('============= END : Create Record ===========');
  }






  // If you want to query all Incidents at once.
  async queryAll(stub, args) {
    if (args.length != 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
    }
    let startKey = args[0];
    let endKey = args[1];

    let iterator = await stub.getStateByRange(startKey, endKey);

    let allResults = [];
    while (true) {
      let res = await iterator.next();

      if (res.value && res.value.value.toString()) {
        let jsonRes = {};
        console.log(res.value.value.toString('utf8'));

        jsonRes.Key = res.value.key;
        try {
          jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
        } catch (err) {
          console.log(err);
          jsonRes.Record = res.value.value.toString('utf8');
        }
        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('end of data');
        await iterator.close();
        console.info(allResults);
        return Buffer.from(JSON.stringify(allResults));
      }
    }
  }



};

shim.start(new Chaincode());
