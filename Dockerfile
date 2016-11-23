#FROM ubuntu
#RUN apt-get update
#RUN apt-get install -y git nodejs npm nodejs-legacy
#RUN git clone git://github.com/DuoSoftware/DVP-Wallet.git /usr/local/src/walletservice
#RUN cd /usr/local/src/walletservice; npm install
#CMD ["nodejs", "/usr/local/src/walletservice/app.js"]

#EXPOSE 8877

FROM node:5.10.0
RUN git clone git://github.com/DuoSoftware/DVP-Wallet.git /usr/local/src/walletservice
RUN cd /usr/local/src/walletservice;
WORKDIR /usr/local/src/walletservice
RUN npm install
EXPOSE 8877
CMD [ "node", "/usr/local/src/walletservice/app.js" ]