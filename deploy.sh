#!/bin/bash
# This script deploys the project to a remote server using rsync.
# It copies the necessary files to a deploy directory and then syncs them to the server.
# It also creates a log file to track the deployment process.
# Usage: ./deploy.sh

LOGFILE='deploy.log'
SERVER='tero@192.168.0.20'          # Change this to your server address
TARGET_DIR='~/services/aidon-comm'  # Change this to your target directory

# Base directory for this entire project
BASEDIR=$(cd $(dirname $0) && pwd)
DEPLOYDIR=$BASEDIR'/.deploy'

# Copy files to deploy directory
echo "Copying files to $DEPLOYDIR"
rm -rf $DEPLOYDIR
mkdir -p $DEPLOYDIR/dist
mkdir -p $DEPLOYDIR/logs
cp -r $BASEDIR/dist/*.js $DEPLOYDIR/dist
cp $BASEDIR/docker-compose.yml $DEPLOYDIR
cp $BASEDIR/Dockerfile $DEPLOYDIR
cp $BASEDIR/package*.* $DEPLOYDIR
cp $BASEDIR/.env.production $DEPLOYDIR/.env

SOURCE=$DEPLOYDIR'/'

# Create target directory on the server
ssh $SERVER 'mkdir -p '$TARGET_DIR

TARGET=$SERVER':'$TARGET_DIR
LOGS=$TARGET'/logs/'

# Copy logs from the server to local
# rsync -av $LOGS $BASEDIR'/logs' >> $DEPLOYDIR'/'$LOGFILE

# Sync files to the server
rsync -av --delete $SOURCE $TARGET >> $DEPLOYDIR'/'$LOGFILE

