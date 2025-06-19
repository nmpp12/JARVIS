import speech_recognition as sr
import pyttsx3
import google.generativeai as genai
from datetime import datetime

# --- CONFIGURAÇÃO ---
# Coloca a tua chave de API aqui
GEMINI_API_KEY = 'AIzaSyAmXLAQ-WFnoZ7kYt-eAUiSC5O8YHqkx9I' 
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Configuração do motor de voz
engine = pyttsx3.init()

# --- FUNÇÕES PRINCIPAIS ---

def falar(texto):
    """Função para o assistente falar."""
    print(f"Assistente: {texto}")
    engine.say(texto)
    engine.runAndWait()

def ouvir():
    """Função para ouvir e reconhecer a fala."""
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("A ouvir...")
        audio = r.listen(source)
        try:
            texto = r.recognize_google(audio, language='pt-PT')
            print(f"Você disse: {texto}")
            return texto
        except sr.UnknownValueError:
            falar("Desculpe, não entendi o que disse.")
            return None
        except sr.RequestError:
            falar("Desculpe, o meu serviço de voz está indisponível.")
            return None

def executar_comando(comando):
    """Decide o que fazer com base no comando."""
    comando = comando.lower()
    
    if 'horas são' in comando:
        agora = datetime.now().strftime('%H:%M')
        falar(f"São {agora}.")
    elif 'adeus' in comando:
        falar("Até à próxima!")
        return False # Termina o loop
    else:
        # Se não for um comando conhecido, pergunta ao Gemini
        try:
            response = model.generate_content(f"Responde de forma concisa à seguinte pergunta: {comando}")
            falar(response.text)
        except Exception as e:
            falar(f"Ocorreu um erro ao contactar a inteligência artificial. {e}")
            
    return True # Continua o loop

# --- LOOP PRINCIPAL ---
if __name__ == '__main__':
    falar("Olá! Eu sou o seu assistente pessoal. Como posso ajudar?")
    continuar = True
    while continuar:
        comando = ouvir()
        if comando:
            continuar = executar_comando(comando)