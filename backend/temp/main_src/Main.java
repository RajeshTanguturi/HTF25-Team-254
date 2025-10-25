
import java.io.*;
import java.lang.reflect.*;
import java.util.*;

public class Main {

    static Object parseJsonValue(String s) {
        if (s == null) return null;
        s = s.trim();
        if (s.length() == 0) return "";
        if (s.equals("null")) return null;
        if (s.equals("true")) return Boolean.TRUE;
        if (s.equals("false")) return Boolean.FALSE;
        if (s.length() >= 2) {
            int c0 = (int) s.charAt(0);
            int c1 = (int) s.charAt(s.length()-1);
            if ((c0 == 39 && c1 == 39) || (c0 == 34 && c1 == 34)) {
                return unescapeJavaString(s.substring(1, s.length()-1));
            }
        }
        if (s.startsWith("[") && s.endsWith("]")) {
            String inner = s.substring(1, s.length()-1);
            List<Object> list = new ArrayList<>();
            if (inner.trim().length() == 0) return list;
            int depth = 0;
            boolean inQuote = false;
            StringBuilder buf = new StringBuilder();
            for (int i = 0; i < inner.length(); i++) {
                char c = inner.charAt(i);
                if ((int)c == 34 && (i == 0 || inner.charAt(i-1) != (char)92)) inQuote = !inQuote;
                if (!inQuote) {
                    if (c == '[' || c == '{') depth++;
                    if (c == ']' || c == '}') depth--;
                    if (c == ',' && depth == 0) {
                        list.add(parseJsonValue(buf.toString()));
                        buf.setLength(0);
                        continue;
                    }
                }
                buf.append(c);
            }
            if (buf.length() > 0) list.add(parseJsonValue(buf.toString()));
            return list;
        }
        try {
            if (s.indexOf('.') >= 0) return Double.parseDouble(s);
            else {
                try { return Integer.parseInt(s); } catch (NumberFormatException e) { return Long.parseLong(s); }
            }
        } catch (Exception e) {
            if ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("\'") && s.endsWith("\'"))) return s.substring(1, s.length()-1);
            return s;
        }
    }

    static String unescapeJavaString(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if ((int)ch == 92) {
                if (i+1 >= s.length()) { sb.append(ch); continue; }
                char next = s.charAt(i+1);
                if (next == 'n') { sb.append('\n'); i++; continue; }
                if (next == 't') { sb.append('\t'); i++; continue; }
                if (next == 'r') { sb.append('\r'); i++; continue; }
                if (next == '"') { sb.append('"'); i++; continue; }
                if (next == '\\') { sb.append('\\'); i++; continue; }
                sb.append(next); i++; continue;
            } else sb.append(ch);
        }
        return sb.toString();
    }

    static Object convertArg(Object parsed, Class<?> paramType) throws Exception {
        if (paramType.isPrimitive()) {
            if (paramType == int.class) {
                if (parsed instanceof Number) return ((Number)parsed).intValue();
                if (parsed instanceof String) return Integer.parseInt((String)parsed);
            } else if (paramType == long.class) {
                if (parsed instanceof Number) return ((Number)parsed).longValue();
                if (parsed instanceof String) return Long.parseLong((String)parsed);
            } else if (paramType == double.class) {
                if (parsed instanceof Number) return ((Number)parsed).doubleValue();
                if (parsed instanceof String) return Double.parseDouble((String)parsed);
            } else if (paramType == boolean.class) {
                if (parsed instanceof Boolean) return parsed;
                if (parsed instanceof String) return Boolean.parseBoolean((String)parsed);
            } else if (paramType == char.class) {
                if (parsed instanceof String && ((String)parsed).length() > 0) return ((String)parsed).charAt(0);
            }
        } else {
            if (Number.class.isAssignableFrom(paramType)) {
                if (parsed instanceof Number) {
                    Number n = (Number) parsed;
                    if (paramType == Integer.class) return n.intValue();
                    if (paramType == Long.class) return n.longValue();
                    if (paramType == Double.class) return n.doubleValue();
                    if (paramType == Float.class) return n.floatValue();
                }
                if (parsed instanceof String) {
                    String str = (String) parsed;
                    if (paramType == Integer.class) return Integer.valueOf(str);
                    if (paramType == Long.class) return Long.valueOf(str);
                    if (paramType == Double.class) return Double.valueOf(str);
                    if (paramType == Float.class) return Float.valueOf(str);
                }
            }
            if (paramType == String.class) {
                if (parsed == null) return null;
                if (parsed instanceof String) return parsed;
                return String.valueOf(parsed);
            }
            if (paramType == Boolean.class) {
                if (parsed instanceof Boolean) return parsed;
                if (parsed instanceof String) return Boolean.valueOf((String)parsed);
            }
            if (paramType.isArray()) {
                Class<?> comp = paramType.getComponentType();
                if (parsed instanceof List) {
                    List<?> lst = (List<?>) parsed;
                    Object arr = Array.newInstance(comp, lst.size());
                    for (int i = 0; i < lst.size(); i++) Array.set(arr, i, convertArg(lst.get(i), comp));
                    return arr;
                }
                Object arr = Array.newInstance(comp, 1);
                Array.set(arr, 0, convertArg(parsed, comp));
                return arr;
            }
            if (List.class.isAssignableFrom(paramType) || Collection.class.isAssignableFrom(paramType)) {
                if (parsed instanceof List) return parsed;
                List<Object> l = new ArrayList<>();
                l.add(parsed);
                return l;
            }
            if (paramType == Object.class) return parsed;
            if (parsed instanceof Number) {
                Number n = (Number) parsed;
                try {
                    Method valueOf = paramType.getMethod("valueOf", String.class);
                    return valueOf.invoke(null, n.toString());
                } catch (Exception ignore) {}
            }
        }
        if (parsed == null) return null;
        if (paramType.isInstance(parsed)) return parsed;
        throw new IllegalArgumentException("Cannot convert " + parsed.getClass().getName() + " to " + paramType.getName());
    }

    static Object invokeSolveReflectively(Object solInstance, List<Object> argsList) throws Exception {
        Method[] methods = solInstance.getClass().getDeclaredMethods();
        List<Method> candidates = new ArrayList<>();
        for (Method m : methods) if (m.getName().equals("solve")) candidates.add(m);

        for (Method m : candidates) {
            Class<?>[] pts = m.getParameterTypes();
            if (pts.length == argsList.size()) {
                try {
                    Object[] conv = new Object[pts.length];
                    for (int i = 0; i < pts.length; i++) conv[i] = convertArg(argsList.get(i), pts[i]);
                    m.setAccessible(true);
                    return m.invoke(solInstance, conv);
                } catch (Exception e) {}
            }
        }

        for (Method m : candidates) {
            Class<?>[] pts = m.getParameterTypes();
            if (pts.length == 1) {
                try {
                    Object conv = convertArg(argsList, pts[0]);
                    m.setAccessible(true);
                    return m.invoke(solInstance, conv);
                } catch (Exception e) {}
            }
        }

        for (Method m : candidates) {
            if (m.isVarArgs()) {
                Class<?>[] pts = m.getParameterTypes();
                int fixed = pts.length - 1;
                if (argsList.size() >= fixed) {
                    try {
                        Object[] conv = new Object[pts.length];
                        for (int i = 0; i < fixed; i++) conv[i] = convertArg(argsList.get(i), pts[i]);
                        Class<?> varComp = pts[pts.length - 1].getComponentType();
                        int varlen = argsList.size() - fixed;
                        Object vararr = Array.newInstance(varComp, varlen);
                        for (int i = 0; i < varlen; i++) Array.set(vararr, i, convertArg(argsList.get(fixed + i), varComp));
                        conv[conv.length - 1] = vararr;
                        m.setAccessible(true);
                        return m.invoke(solInstance, conv);
                    } catch (Exception e) {}
                }
            }
        }

        for (Method m : candidates) {
            if (m.getParameterTypes().length == 0) {
                m.setAccessible(true);
                return m.invoke(solInstance);
            }
        }

        throw new NoSuchMethodException("No suitable solve(...) method found for provided arguments.");
    }

    static String toJsonLike(Object val) {
        if (val == null) return "null";
        if (val instanceof String) return quoteAndEscape((String)val);
        if (val instanceof Boolean) return val.toString();
        if (val instanceof Number) return val.toString();
        if (val.getClass().isArray()) {
            int len = Array.getLength(val);
            StringBuilder sb = new StringBuilder();
            sb.append("[");
            for (int i = 0; i < len; i++) {
                if (i > 0) sb.append(",");
                sb.append(toJsonLike(Array.get(val, i)));
            }
            sb.append("]");
            return sb.toString();
        }
        if (val instanceof Collection) {
            Collection<?> c = (Collection<?>) val;
            StringBuilder sb = new StringBuilder();
            sb.append("[");
            int i = 0;
            for (Object o : c) {
                if (i++ > 0) sb.append(",");
                sb.append(toJsonLike(o));
            }
            sb.append("]");
            return sb.toString();
        }
        if (val instanceof Map) {
            Map<?, ?> m = (Map<?, ?>) val;
            StringBuilder sb = new StringBuilder();
            sb.append("{");
            List<String> keys = new ArrayList<>();
            for (Object k : m.keySet()) keys.add(String.valueOf(k));
            Collections.sort(keys);
            int i = 0;
            for (String k : keys) {
                if (i++ > 0) sb.append(",");
                sb.append(quoteAndEscape(k)).append(":").append(toJsonLike(m.get(k)));
            }
            sb.append("}");
            return sb.toString();
        }
        return quoteAndEscape(val.toString());
    }

    static String quoteAndEscape(String s) {
        StringBuilder sb = new StringBuilder();
        sb.append((char)34);
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == (char)34) { sb.append((char)92); sb.append((char)34); }
            else if (ch == (char)92) { sb.append((char)92); sb.append((char)92); }
            else if (ch == (char)10) { sb.append((char)92); sb.append('n'); }
            else if (ch == (char)13) { sb.append((char)92); sb.append('r'); }
            else if (ch == (char)9) { sb.append((char)92); sb.append('t'); }
            else sb.append(ch);
        }
        sb.append((char)34);
        return sb.toString();
    }

    public static void main(String[] args) {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        PrintWriter out = new PrintWriter(System.out);
        try {
            Class<?> solClass = null;
            try { solClass = Class.forName("Solution"); } catch (ClassNotFoundException cnfe) {}
            String line;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.length() == 0) continue;
                try {
                    Object parsed = parseJsonValue(line);
                    List<Object> argsList;
                    if (parsed instanceof List) argsList = (List<Object>) parsed;
                    else { argsList = new ArrayList<>(); argsList.add(parsed); }
                    if (solClass == null) solClass = Class.forName("Solution");
                    Object solInstance = solClass.getDeclaredConstructor().newInstance();
                    Object result = invokeSolveReflectively(solInstance, argsList);
                    out.println(toJsonLike(result));
                } catch (Throwable e) {
                    StringWriter sw = new StringWriter();
                    e.printStackTrace(new PrintWriter(sw));
                    out.println("ERROR:" + sw.toString());
                }
            }
            out.flush();
        } catch (IOException e) {
            e.printStackTrace(System.err);
        }
    }
}
