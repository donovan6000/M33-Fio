#!/bin/sh

# Check if parameters aren't provided
if [ "$#" -ne 3 ] ; then

	# Display error and exit
        echo "Provide branch, version, and comment parameters, like devel 0.1 \"test\""
        exit
fi

# Check if pushing to devel branch
if [ $1 = "devel" ]; then

	# Change version string to date
	sed -i "s/.*plugin_version = .*/plugin_version = \"$2.`date +%Y%m%d%H`\"/" setup.py

# Otherwise
else

	# Change version string to version
	sed -i "s/.*plugin_version = .*/plugin_version = \"$2\"/" setup.py
fi

# Remove backup and python byte code files
find ./ -name '*~' | xargs rm
find ./ -name '*.pyc' | xargs rm

# Push changes
git add .
git commit -m "$3"
git push origin $1
