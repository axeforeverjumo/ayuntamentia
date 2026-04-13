from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import search, chat, dashboard, alertas, actas, municipios, informes, admin, subscripciones, parlament, recepcion

app = FastAPI(
    title="AyuntamentIA API",
    description="API de inteligencia política para plenos municipales de Catalunya",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(alertas.router, prefix="/api/alertas", tags=["alertas"])
app.include_router(actas.router, prefix="/api/actas", tags=["actas"])
app.include_router(municipios.router, prefix="/api/municipios", tags=["municipios"])
app.include_router(informes.router, prefix="/api/informes", tags=["informes"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(subscripciones.router, prefix="/api/subscripciones", tags=["subscripciones"])
app.include_router(parlament.router, prefix="/api/parlament", tags=["parlament"])
app.include_router(recepcion.router, prefix="/api/recepcion", tags=["recepcion"])


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ayuntamentia-api"}
