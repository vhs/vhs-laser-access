#!/bin/bash

TEMPLATE=$1

if [ "${TEMPLATE}" = "" ] ; then
	TEMPLATE=vanhack/vhs-laser-access:buildx-test
fi

TEMPLATE_PATH=$(echo "${TEMPLATE}" | cut -f1 -d:)
TEMPLATE_TAG=$(echo "${TEMPLATE}" | cut -f2- -d: | sed 's:/:-:g')

TEMPLATE="${TEMPLATE_PATH}:${TEMPLATE_TAG}"

if [ -f .build.env ]; then
        . .build.env
fi

jq '. += {"experimental": "enabled"}' ~/.docker/config.json >~/.docker/config.json.tmp
cat ~/.docker/config.json.tmp >~/.docker/config.json
rm ~/.docker/config.json.tmp

XBUILDER=$(docker buildx ls | egrep xbuilder)

if [ "$XBUILDER" = "" ]; then
        docker buildx create --name xbuilder --driver docker-container --use
else
        docker buildx use xbuilder
fi

docker buildx build --platform linux/arm64,linux/arm/v7,linux/arm/v6 -t $TEMPLATE --push .
