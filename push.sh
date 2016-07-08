#!/bin/sh

# Check if parameters aren't provided
if [ "$#" -ne 3 ] ; then

	# Display error and exit
	echo "Provide type, version, and comment parameters, like release 0.1 \"test\""
	exit
fi

# Check if releasing a new version
if [ $1 = "release" ]; then

	# Change version string to version
	sed -i "s/.*plugin_version = .*/plugin_version = \"$2\"/" setup.py

# Otherwise
else

	# Change version string to date
	sed -i "s/.*plugin_version = .*/plugin_version = \"$2.`date +%Y%m%d%H`\"/" setup.py
fi

# Remove backup and python byte code files
find ./ -name '*~' -print0 | xargs -0 rm
find ./ -name '*.pyc' -print0 | xargs -0 rm

# Push changes
git add .
git commit -m "$3"
git push origin devel
