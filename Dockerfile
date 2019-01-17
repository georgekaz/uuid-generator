FROM python:3

ENV FLASK_APP=/uuid-generator/app/__init__.py

COPY requirements.txt /uuid-generator/requirements.txt
COPY app /uuid-generator/app

RUN pip install -r /uuid-generator/requirements.txt

ENTRYPOINT [ "flask" ]
CMD [ "run" ]
