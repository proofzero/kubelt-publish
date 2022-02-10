# coding: utf-8
import sys
reload(sys)
sys.setdefaultencoding('utf-8')

import cv2
import numpy as np
import matplotlib.pyplot as plt
import os
import shutil
import json
import sha3


KECCAK_256 = sha3.keccak_256()

TILE_IMG_BASE_URL = "https://storage.googleapis.com/test-colored-tiles/tiles"

def createTile(metadata):
    """Create new image(numpy array) filled with certain color in RGB"""
    # Create black blank image
    image = np.zeros((300, 300, 3), np.uint8)
    rgb_color = (int(metadata["color_red"]), int(metadata["color_green"]), int(metadata["color_blue"]))

    # Since OpenCV uses BGR, convert the color first
    color = tuple(reversed(rgb_color))
    # Fill image with color
    image[:] = color

    return image

def extractMetadata(color_tsv_entry):

	color_entry_split = color_tsv_entry.split("\t")

	metadata = {
		"object_type": "Colored Tile",
		"color_id": color_entry_split[0],
		"color_name": color_entry_split[1],
		"color_hex": color_entry_split[2],
		"color_red": color_entry_split[3],
		"color_green": color_entry_split[4],
		"color_blue": color_entry_split[5]
	}

	fingerprint_id = metadata["color_name"] + " | " + metadata["color_hex"] + " | rgb(" + metadata["color_red"] + ", " + metadata["color_green"] + ", " + metadata["color_blue"] + ")" 
	KECCAK_256.update(fingerprint_id)
	fingerprint_hash = "0x" + KECCAK_256.hexdigest()
	fingerprint_method = "keccak256(bytes(fingerprint.id))"

	metadata["fingerprint_id"] =  fingerprint_id
	metadata["fingerprint_hash"] = fingerprint_hash
	metadata["fingerprint_method"] = fingerprint_method

	metadata["img_url"] = TILE_IMG_BASE_URL + "/" + metadata["color_id"] + ".jpg"

	return metadata


def traitWithType(trait_type, value):
	return {"trait_type": trait_type, "value": value}


def traitNoType(value):
	return {"value": value}


def toRevealedAndUnrevealed(metadata):

	unrevealed = {
		"name": "Hidden Colors",
		"description": "Hidden color (" + metadata["fingerprint_hash"] + ")",
		"image": TILE_IMG_BASE_URL + "/unrevealed.jpg"
	}

	revealed = {
		"id": metadata["color_id"],
		"name": metadata["color_name"],
		"image": metadata["img_url"],
		"hex": metadata["color_hex"],
		"fingerprint": {
			"id": metadata["fingerprint_id"],
			"hash": metadata["fingerprint_hash"],
			"method": metadata["fingerprint_method"]
		},
		"attributes": [
			traitNoType(metadata["object_type"]),
			traitWithType("Red", metadata["color_red"]),
			traitWithType("Green", metadata["color_green"]),
			traitWithType("Blue", metadata["color_blue"])
		]
	}

	revealed["description"] = metadata["object_type"] + " | Name: " + metadata["color_name"] + " | Hex: " + metadata["color_hex"]

	return unrevealed, revealed


def tsvHeadline():
	return "\t".join([
		"Object Type",
		"Fingerprint Id",
		"Fingerprint Hash",
		"Fingerprint Method",
		"Color Id",
		"Color Number",
		"Color Name",
		"Color R",
		"Color G",
		"Color B",
		"Image URL"
	])

def toTsv(metadata):
	return "\t".join([
		metadata["object_type"],
		metadata["color_id"],
		metadata["color_name"],
		metadata["color_hex"],
		metadata["fingerprint_id"],
		metadata["fingerprint_hash"],
		metadata["fingerprint_method"],
		metadata["color_red"],
		metadata["color_green"],
		metadata["color_blue"],
		metadata["img_url"]
	])



def main():

	colors_data_file = "../resources/colors.tsv"
	output_base = "../metadata"
	unrevealed_metadata_dir = os.path.join(output_base, "unrevealed")
	revealed_metadata_dir = os.path.join(output_base, "revealed")
	tiles_dir = os.path.join(output_base, "tiles")
	output_summary_file = os.path.join(output_base, "metadata_summary.tsv")

	if os.path.exists(output_base):
		shutil.rmtree(output_base)
	os.makedirs(output_base)
	os.makedirs(unrevealed_metadata_dir)
	os.makedirs(revealed_metadata_dir)
	os.makedirs(tiles_dir)

	with open(output_summary_file, 'w') as f:
		f.write(tsvHeadline())
		f.write("\n")
		f.flush()

		for tsv_entry in open(colors_data_file,mode='r').readlines()[1:]:
			
			metadata = extractMetadata(tsv_entry.replace("\n", ""))

			f.write(toTsv(metadata))
			f.write("\n")
			f.flush()

			(unrevealed, revealed) = toRevealedAndUnrevealed(metadata)

			with open(os.path.join(unrevealed_metadata_dir, str(metadata["fingerprint_hash"])), 'w') as handler:
				handler.write(json.dumps(unrevealed))
				handler.flush()
				handler.close()

			with open(os.path.join(revealed_metadata_dir, str(metadata["fingerprint_hash"])), 'w') as handler:
				handler.write(json.dumps(revealed))
				handler.flush()
				handler.close()

			tile = createTile(metadata)

			cv2.imwrite(os.path.join(tiles_dir, metadata["color_id"] + ".jpg"), tile)

		f.close()

if __name__ == "__main__":
	main()