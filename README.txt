List Lambda Functions
******************************
PreRequisites:
1. Editor like Visual Studio Code to run the Node js environment
2. MySQL table "lambdalist" with the columns (all varchar)
	`AccountId`, `Profile`, `Region`, `FunctionName`, `Runtime`, `DeprecationStatus`
3. Add the credentials of list of accounts for which the script has to be added in the ~/.aws/config. Run aws configure with profile switch and enter access and secret key ids
	$aws configure --profile <profile_name>
	(Functionality can be improvised to use assume role from master account id and STS token)
Setup & Usage:
git clone https://github.com/anuvembu/listFunctions-lambda.git
cd 
node index.js

Example Output:




