FROM continuumio/miniconda3

# update the latest packages
RUN apt-get -y update

# add the conda environment file (from which conda environment will be created)
ADD environment.yml /etc/environment.yml

# create conda environment from file
RUN conda env create -f /etc/environment.yml

# make RUN commands use the new environment by specifying path:
ENV PATH /opt/conda/envs/test-python-env/bin:$PATH
# activate the conda environment
RUN /bin/bash -c "source activate test-python-env"
#RUN echo "conda activate test-python-env" > ~/.bashrc

# set the working directory
WORKDIR /usr/app

# copy source files
COPY src/ ./src

ENTRYPOINT ["python",  "./src/process_files.py"]
