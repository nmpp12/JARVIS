#!/usr/bin/env sh

#
# Copyright 2015 the original author or authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

##############################################################################
##
##  Gradle start up script for UN*X
##
##############################################################################

# Attempt to set APP_HOME
# Resolve links: $0 may be a symlink
PRG="$0"
# Need this for relative symlinks.
while [ -h "$PRG" ] ; do
    ls -ld "$PRG"
    link=`expr "$PRG" : '.*->\(.*\)$'`
    if expr "$link" : '/.*' > /dev/null; then
        PRG="$link"
    else
        PRG=`dirname "$PRG"`"/$link"
    fi
done
SAVED="$(cd "$(dirname \"$PRG\")" >/dev/null 2>&1 && pwd)"
cd "$SAVED" >/dev/null 2>&1 || exit

APP_HOME="$(dirname \"$SAVED\")"
export APP_HOME

WHICH_JAVA="which java"
JAVA_EXE="$($WHICH_JAVA)"
if [ -z "$JAVA_EXE" ] ; then
    echo "Error: JAVA_HOME is not set and no 'java' command could be found in your PATH."
    echo ""
    echo "Please set the JAVA_HOME variable in your environment to match the"
    echo "location of your Java installation."
    exit 1
fi

if [ ! -x "$JAVA_EXE" ] ; then
    echo "Error: JAVA_HOME is not defined correctly for me to execute java"
    echo "I cannot execute $JAVA_EXE"
    exit 1
fi

if [ -z "$JAVA_HOME" ] ; then
    echo "Warning: JAVA_HOME environment variable is not set."
fi

DIR="$( cd "$( dirname \"$0\" )" && pwd )"
# Use the maximum available, or set MAX_FD != -1 to use that value.
MAX_FD="maximum"

warn () {
    echo "$*" >&2
}

die () {
    echo
    echo "$*"
    echo
    exit 1
}

# OS specific support (must be 'true' or 'false').
darwin=false
msys=false
cygwin=false
case "$(uname)" in
  Darwin* )
    darwin=true
    ;;
  MINGW* )
    msys=true
    ;;
  CYGWIN* )
    cygwin=true
    ;;
esac

# Determine the Java command to use to start the JVM.
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
        # IBM's JDK on AIX uses strange locations for the executables
        JAVACMD="$JAVA_HOME/jre/sh/java"
    else
        JAVACMD="$JAVA_HOME/bin/java"
    fi
    if [ ! -x "$JAVACMD" ] ; then
        die "ERROR: JAVA_HOME is set to an invalid directory: $JAVA_HOME

Please set the JAVA_HOME variable in your environment to match the
location of your Java installation."
    fi
else
    JAVACMD="java"
    which java >/dev/null 2>&1 || die "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.

Please set the JAVA_HOME variable in your environment to match the
location of your Java installation."
fi

# Increase the maximum file descriptors if we can.
if [ "$darwin" = "true" ] && [ -z "$MAX_FD" ] ; then
    MAX_FD="200"
fi

if [ "$MAX_FD" != "" ] && [ "$cygwin" = "false" ] && [ "$msys" = "false" ] ; then
    MAX_FD_LIMIT=$(ulimit -H -n)
    if [ $? -eq 0 ] ; then
        if [ "$MAX_FD" = "maximum" ] || [ "$MAX_FD" = "max" ] ; then
            MAX_FD="$MAX_FD_LIMIT"
        fi
        ulimit -n $MAX_FD
        if [ $? -ne 0 ] ; then
            warn "Could not set maximum file descriptor limit: $MAX_FD"
        fi
    else
        warn "Could not query maximum file descriptor limit: $MAX_FD_LIMIT"
    fi
fi

# For Darwin, add options to specify how the application appears in the dock
if $darwin; then
    GRADLE_OPTS="$GRADLE_OPTS \"-Xdock:name=$APP_NAME\" \"-Xdock:icon=$APP_HOME/media/gradle.icns\""
fi

# For Cygwin or MSYS, switch paths to Windows format before running java
if [ "$cygwin" = "true" ] || [ "$msys" = "true" ] ; then
    APP_HOME=$(cygpath --path --mixed "$APP_HOME")
    CLASSPATH=$(cygpath --path --mixed "$CLASSPATH")
    JAVACMD=$(cygpath --unix "$JAVACMD")
    # We build the pattern for arguments to be converted via cygpath
    ROOTDIRSRAW=$(find -L / -maxdepth 3 -type d -name sources 2>/dev/null)
    SEP=""
    for dir in $ROOTDIRSRAW ; do
        ROOTDIRS="${ROOTDIRS}${SEP}$(cygpath --path --ignore --mixed \"$dir\")"
        SEP=":"
    done
    # By default we should be in the correct project dir, but may not be.
    # If we are not, find the .gradlew directory.
    # If we are in the same directory as the script, $BASEDIR can stay as is.
    # If we are NOT in the same directory as the script, then we need to find the .gradlew.
    if [ ! -z "$DIRCHANGE" ] ; then
        cd "$DIRCHANGE"
    fi
    # If there is a java.env, source.
    if [ -f "${BASEDIR}/java.env" ] ; then
        . "${BASEDIR}/java.env"
    fi
fi

# splitlines with \n internally, so we can do sed 's|$|/|g' to append the run marker
CLASSPATH_BEFORE_JAR="${APP_HOME}/gradle/wrapper/gradle-wrapper.jar"
CLASSPATH="${CLASSPATH_BEFORE_JAR}"

# Determine the base path for relative symlinks.
BASEDIR=$(dirname "$(echo \"$0\" | sed -e 's|^./||' -e 's|/$||' -e 's|/bin/.*||')")

DIR="$BASEDIR"/gradle/wrapper
if [ ! -f "$DIR/gradle-wrapper.jar" ] ; then
    echo "Error: gradle-wrapper.jar not found in $DIR"
    exit 1
fi

GRADLE_WRAPPER_PROPERTIES="$DIR/gradle-wrapper.properties"
if [ ! -f "$GRADLE_WRAPPER_PROPERTIES" ] ; then
    echo "Error: gradle-wrapper.properties not found in $DIR"
    exit 1
fi

exec "$JAVACMD" \
  $DEFAULT_JVM_OPTS $JAVA_OPTS $GRADLE_OPTS \
  -classpath "$CLASSPATH" \
  org.gradle.wrapper.GradleWrapperMain \
  "$@"
