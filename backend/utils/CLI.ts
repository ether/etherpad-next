type Argv = {
  settings?: string;
  credentials?: string;
  sessionkey?: string;
  apikey?: string;
};


export const argvP:Argv = {

};

const argv = process.argv.slice(2);
let arg, prevArg = '';

// Loop through args
for (let i = 0; i < argv.length; i++) {
  arg = argv[i];

  // Override location of settings.json file
  if (prevArg === '--settings' || prevArg === '-s') {
    argvP.settings = arg;
  }

  // Override location of credentials.json file
  if (prevArg === '--credentials') {
    argvP.credentials = arg;
  }

  // Override location of settings.json file
  if (prevArg === '--sessionkey') {
    argvP.sessionkey = arg;
  }

  // Override location of APIKEY.txt file
  if (prevArg === '--apikey') {
    argvP.apikey = arg;
  }

  prevArg = arg;
}
