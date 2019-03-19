<?php

// read data from cetcapabilities

$serviceURL = filter_input(INPUT_GET, 'server', FILTER_SANITIZE_STRING);
$layerName = filter_input(INPUT_GET, 'layer', FILTER_SANITIZE_STRING);
$dataValues = array();

$url = "{$serviceURL}?service=WMS&version=1.3.0&request=GetCapabilities";
$xmlData = file_get_contents($url);

$resultString = simplexml_load_string($xmlData);
$data = $resultString->Capability->Layer->Layer;

$results = array();

foreach($data as $layer) {

    if((string)$layer->Name == $layerName) {
        $width = (string)$layer->Style->LegendURL->attributes()->width ."px";
        $height = (string)$layer->Style->LegendURL->attributes()->height ."px";

        $link = (string)$layer->Style->LegendURL->OnlineResource->attributes('xlink', TRUE)->href;
    }
}

print "{\"link\":\"{$link}\",\"width\":\"{$width}\",\"height\":\"{$height}\"}";