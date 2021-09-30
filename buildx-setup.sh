#!/bin/sh

sudo apt-get update
sudo apt-get install -y qemu-user jq
sudo docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
