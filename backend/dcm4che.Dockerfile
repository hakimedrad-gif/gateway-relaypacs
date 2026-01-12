FROM ubuntu:24.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install dcm4che toolkit
ENV DCM4CHE_VERSION=5.34.2
RUN wget -v -O dcm4che.zip "https://downloads.sourceforge.net/project/dcm4che/dcm4che3/${DCM4CHE_VERSION}/dcm4che-${DCM4CHE_VERSION}-bin.zip" \
    && unzip dcm4che.zip \
    && mv dcm4che-${DCM4CHE_VERSION} /opt/dcm4che \
    && rm dcm4che.zip

# Add dcm4che to path
ENV PATH="/opt/dcm4che/bin:${PATH}"

# Expose DICOM port
EXPOSE 11112

# Run storescp as the DICOM storage server
# -b: AE title:port
# --directory: storage directory
RUN mkdir -p /var/local/dcm4che/data
CMD ["storescp", "-b", "DCM4CHE:11112", "--directory", "/var/local/dcm4che/data"]
