const aws = require('aws-sdk');
//const config = aws.config.loadFromPath('./config.json');

//Declare list of profiles 
//Need to search for api that returns profile names from config file
const profiles = ["default", "linkedaccount"];

//Declare regions where lambda is supported or used with your accounts
var regions = ["ap-southeast-2", "us-east-2"];

//Deprecation information from AWS documentation
var runtimeRef = [
    {runtime: "nodejs", create_deprecation : "October 31 2016", update_deprecation: "October 31 2016"},
    {runtime: "nodejs4.3", create_deprecation : "December 15 2018", update_deprecation: "April 30 2019"},
    {runtime: "nodejs4.3-edge", create_deprecation : "December 15 2018", update_deprecation: "April 30 2019"},    
    {runtime: "nodejs6.10", create_deprecation : "April 30 2019", update_deprecation: "August 12 2019"},
    {runtime: "dotnetcore2.0", create_deprecation : "April 30 2019", update_deprecation: "May 30 2019"},
    {runtime: "dotnetcore1.0", create_deprecation : "June 27 2019", update_deprecation: "July 31 2019"}   
];
var today = new Date();
var mysql = require('mysql');

var pool = mysql.createPool({
    //var connection = mysql.createConnection({
    host: 'mymysqldatabase.cgqsutzwvgnz.ap-southeast-2.rds.amazonaws.com',
    user: 'admin',
    password: 'admin123',
    port: '3306',
    database: 'mydb'
});

startApp();

/*
 * Main function 
 */
async function startApp(){
    try{
        //await profiles.forEach(iterateAccounts);
        let j;
        for(j=0; j<profiles.length; j++)
            await iterateAccounts(profiles[j]);
       
    } catch(err) {
        console.log(err);
    } finally {        
        /*if(pool) {
            try{                       
                await pool.end();
                console.log("Closed connection");
            } catch(e) {
                console.log(e);
            }
        }*/
    }
}

/*
 * Iterate the list of Accounts 
 * Credentials(AccessId and SecretKey) of the account are got from aws config file for that profile
 */
async function iterateAccounts(profile) {
    const credentials = aws.config.credentials = new aws.SharedIniFileCredentials({profile: profile});    
    let i;
    for(i=0; i<regions.length; i++ ){
        await iterateRegions(regions[i], profile);
    }    
}


/*
 * Iterate all listed regions for the account to get the list of lambdas
 */
async function iterateRegions(region, profile) {
    try {
        aws.config.setPromisesDependency();
        aws.config.update({
            region: region
        });

        const lambda = new aws.Lambda();
        const response = await lambda.listFunctions({
            FunctionVersion: 'ALL'
        }).promise();

        console.log(response.Functions.length);
        var i;
        for (i = 0; i < response.Functions.length; i++) {
            let functionName = response.Functions[i].FunctionName;
            let runtime = response.Functions[i].Runtime;
            let accountId = response.Functions[i].FunctionArn.split(":")[4];
            let deprecationStatus = await validateRuntime(runtime);
            //console.log(deprecationStatus);

            pool.getConnection(function (error, connection) {
                connection.query("insert into lambdalist values(?,?,?,?,?,?)", [accountId, profile, region, functionName, runtime, deprecationStatus], function (error, results, fields) {
                    connection.release();
                    if (error) throw error;             
                });
            });
            
            /*pool.query("insert into lambdalist values(?,?,?,?,?,?)", [accountId, profile, region, functionName, runtime, deprecationStatus], function (error) {                
                if (error) throw error;             
            });*/
        }
    } catch (e) {
        console.log("error:", e);
    }
    debugger;    
}

/*
 * Validates the runtime of the lambda function(Parameter) against the defined list (runtimeRef) 
 * Returns null if no match or deprecation date greater than today 
 */
function validateRuntime(funcRuntime) {
    let temp;
    let valid = null;

    for (temp = 0; temp < runtimeRef.length; temp++) {
        let currItem = runtimeRef[temp];
        if (funcRuntime == currItem.runtime) {
            //console.log("Match");
            let create_deprecation = new Date(currItem.create_deprecation);
            let update_deprecation = new Date(currItem.update_deprecation)
            if (today > create_deprecation && today > update_deprecation)
                valid = "Deprecated";                
            else if (today > create_deprecation || today > update_deprecation) {
                if (today > update_deprecation)
                    valid = "UpdateDeprecated";
                else if (today > create_deprecation)
                    valid = "CreateDeprecated";
            }            
        }
        
    }
    return valid;
}
