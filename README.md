# UNN
You're the neural network! A website where anyone can participate in calculating weights for a neural network to recognize numbers.

Made for HackClub's [Midnight](https://midnight.hackclub.com/).

## Launch
Install NodeJS, then download https://github.com/JC-ProgJava/Handwritten-Digit-Dataset/releases into `training/dataset/`. Then it's just `npm i` to install the dependencies, and `npm start` to start the server on port 40067. It's also recommended that you add a Cloudflare captcha to your website.

## Development
To train, download https://github.com/JC-ProgJava/Handwritten-Digit-Dataset/releases and put it into `training/dataset/`. Then, run `npm run train` and watch it learn!

To test:
```bash
BYPASS_RATE_LIMIT=1 npm start
```
and in another window,
```
npm test
```